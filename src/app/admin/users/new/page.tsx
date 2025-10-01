"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Helper function to delete file from GridFS
async function handleDeleteFile(fileUrl: string) {
  try {
    const fileId = fileUrl.split("/").pop();
    if (!fileId) {
      console.warn("Invalid file URL, skipping deletion:", fileUrl);
      return;
    }

    const deleteRes = await fetch(`/api/media/${fileId}`, {
      method: "DELETE",
    });

    if (!deleteRes.ok) {
      console.error(`Failed to delete file ${fileId}`);
    } else {
      console.log(`Successfully deleted file ${fileId}`);
    }
  } catch (err) {
    console.error("Error deleting file:", err);
  }
}

export default function CreateUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Basic fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "contributor" | "both">("admin");
  
  // Contributor fields
  const [contributorType, setContributorType] = useState<"student" | "staff">("student");
  const [branch, setBranch] = useState<"IT" | "ADS">("IT");
  const [staffTitle, setStaffTitle] = useState("");
  const [yearOfPassing, setYearOfPassing] = useState("");
  const [registerNo, setRegisterNo] = useState("");
  
  // NEW: Store File objects instead of URLs - upload on save only!
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [profilePreview, setProfilePreview] = useState<string>("");
  const [avatarUrlText, setAvatarUrlText] = useState(""); // For external URL option
  const [profileUrlText, setProfileUrlText] = useState(""); // For external URL option
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  
  const avatarFileRef = useRef<HTMLInputElement | null>(null);
  const profileFileRef = useRef<HTMLInputElement | null>(null);
  const [avatarFileKey, setAvatarFileKey] = useState(0);
  const [profileFileKey, setProfileFileKey] = useState(0);

  const userRole = session?.user?.role;
  const isAdmin = userRole === "admin" || userRole === "both";

  // Clean up preview URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (profilePreview) URL.revokeObjectURL(profilePreview);
    };
  }, [avatarPreview, profilePreview]);

  // Prevent navigation during save
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = "Save in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [loading]);

  if (status === "loading") {
    return <div className="min-h-screen p-6 max-w-3xl mx-auto">Loading...</div>;
  }
  
  if (!isAdmin) {
    return <div className="min-h-screen p-6 max-w-3xl mx-auto">Access denied. Admin privileges required.</div>;
  }

  async function uploadToGridFS(file: File, signal?: AbortSignal) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
      signal, // Support cancellation
    });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return `/api/media/${data.fileId}`;
  }

  // NEW: Just store the file, don't upload yet
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Store the File object
    setAvatarFile(file);
    setAvatarUrlText(""); // Clear URL when file is selected
    
    // Clean up old preview URL
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    
    // Create preview URL from File object
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
  };

  const handleRemoveAvatar = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview("");
    setAvatarFileKey(prev => prev + 1);
    if (avatarFileRef.current) {
      avatarFileRef.current.value = "";
    }
  };

  // NEW: Just store the file, don't upload yet
  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Store the File object
    setProfileFile(file);
    setProfileUrlText(""); // Clear URL when file is selected
    
    // Clean up old preview URL
    if (profilePreview) {
      URL.revokeObjectURL(profilePreview);
    }
    
    // Create preview URL from File object
    const preview = URL.createObjectURL(file);
    setProfilePreview(preview);
    setProfileUrlText(""); // Clear URL text if uploading file
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      setMessage({ type: 'error', text: 'Name and email are required' });
      return;
    }

    // Validate type fields
    if (!contributorType) {
      setMessage({ type: 'error', text: 'User type is required' });
      return;
    }
    if (contributorType === "student" && !branch) {
      setMessage({ type: 'error', text: 'Branch is required for students' });
      return;
    }
    if (contributorType === "student" && !yearOfPassing) {
      setMessage({ type: 'error', text: 'Year of passing is required for students' });
      return;
    }
    if (contributorType === "student" && !registerNo) {
      setMessage({ type: 'error', text: 'Register number is required for students' });
      return;
    }
    if (contributorType === "student" && registerNo && !/^\d{14}$/.test(registerNo)) {
      setMessage({ type: 'error', text: 'Register number must be exactly 14 digits' });
      return;
    }
    if (contributorType === "staff" && !staffTitle) {
      setMessage({ type: 'error', text: 'Staff title is required for staff' });
      return;
    }

    setLoading(true);
    setMessage(null);

    // Create AbortController for cancellation support
    const abortController = new AbortController();
    
    // Track uploaded files for rollback on failure or cancellation
    const uploadedFiles: string[] = [];

    try {
      // NEW: Upload files ONLY when saving or use URLs
      let avatarUrl = "";
      let profileUrl = "";
      
      if (avatarFile) {
        avatarUrl = await uploadToGridFS(avatarFile, abortController.signal);
        uploadedFiles.push(avatarUrl);
      } else if (avatarUrlText) {
        avatarUrl = avatarUrlText; // Use URL directly
      }
      
      if (profileFile) {
        profileUrl = await uploadToGridFS(profileFile, abortController.signal);
        uploadedFiles.push(profileUrl);
      } else if (profileUrlText) {
        profileUrl = profileUrlText; // Use URL directly
      }

      const payload: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        role,
        contributorType,
        branch,
        staffTitle,
        yearOfPassing,
        registerNo,
        avatarUrl,
        profileUrl,
      };

      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        // No cleanup needed - files uploaded and referenced immediately!
        
        if (data.warning) {
          setMessage({ 
            type: 'warning', 
            text: `${data.warning}${data.password ? ` Temporary password: ${data.password}` : ''}` 
          });
        } else {
          setMessage({ type: 'success', text: data.message });
        }
        
        // Reset form
        setName("");
        setEmail("");
        setRole("admin");
        setContributorType("student");
        setBranch("IT");
        setStaffTitle("");
        setYearOfPassing("");
        setRegisterNo("");
        setAvatarFile(null);
        setProfileFile(null);
        setAvatarPreview("");
        setProfilePreview("");
        setProfileUrlText("");
        setAvatarFileKey(prev => prev + 1);
        setProfileFileKey(prev => prev + 1);

        // Redirect after 2 seconds
        setTimeout(() => {
          if (role === "admin" || role === "both") {
            router.push("/admin");
          } else {
            router.push("/admin/contributors");
          }
        }, 2000);
      } else {
        // API call failed - rollback uploaded files
        console.error("User creation failed, rolling back uploaded files...");
        await Promise.all(uploadedFiles.map((url: string) => handleDeleteFile(url)));
        setMessage({ type: 'error', text: data.error || 'Failed to create user' });
      }
    } catch (error) {
      console.error("Error creating user:", error);
      
      // Check if operation was aborted (user navigated away or cancelled)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Upload cancelled by user");
      }
      
      // Rollback: Delete any files that were uploaded (even if cancelled)
      if (uploadedFiles.length > 0) {
        console.error("Create failed or cancelled, rolling back uploaded files...", uploadedFiles);
        await Promise.all(uploadedFiles.map((url: string) => handleDeleteFile(url)));
      }
      
      // Don't show error message if user cancelled
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setMessage({ type: 'error', text: 'Network error. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New User</h1>
        <p className="text-gray-600 mt-1">Create admin, contributor, or users with both roles</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                className="w-full border rounded-md px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Role <span className="text-red-600">*</span>
              </label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "contributor" | "both")}
                required
              >
                <option value="admin">Admin Only</option>
                <option value="contributor">Contributor Only</option>
                <option value="both">Both (Admin + Contributor)</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                {role === "admin" && "Can access admin panel only"}
                {role === "contributor" && "Can access contributor dashboard only"}
                {role === "both" && "Can access both admin panel and contributor dashboard"}
              </p>
            </div>
          </div>
        </div>

        {/* User Details - Show for ALL roles */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">User Details</h2>
          
          <div className="space-y-4">
            {/* Avatar Upload */}
            <div>
              <label className="block text-sm font-medium mb-1">Avatar Photo</label>
              <p className="text-xs text-gray-500 mb-2">Upload a photo or provide URL (will upload on save)</p>
              {avatarPreview ? (
                <div className="flex items-center gap-4">
                  <Image
                    src={avatarPreview}
                    alt="Avatar preview"
                    width={80}
                    height={80}
                    className="rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{avatarFile?.name}</p>
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : avatarUrlText ? (
                // External URL
                <div className="flex gap-2">
                  <input
                    type="url"
                    className="flex-1 border rounded-md px-3 py-2"
                    value={avatarUrlText}
                    onChange={(e) => setAvatarUrlText(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <button
                    type="button"
                    onClick={() => setAvatarUrlText("")}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                // No avatar set - show both options
                <div className="space-y-2">
                  <input
                    type="url"
                    className="w-full border rounded-md px-3 py-2"
                    value={avatarUrlText}
                    onChange={(e) => {
                      setAvatarUrlText(e.target.value);
                      if (e.target.value) {
                        // Clear file when URL is entered
                        setAvatarFile(null);
                        setAvatarPreview("");
                        setAvatarFileKey(prev => prev + 1);
                      }
                    }}
                    placeholder="https://example.com/avatar.jpg or upload below"
                  />
                  <div className="text-center text-sm text-gray-500">OR</div>
                  <input
                    key={avatarFileKey}
                    ref={avatarFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
              )}
            </div>

            {/* Profile URL / Image */}
            <div>
              <label className="block text-sm font-medium mb-1">Profile URL or Image</label>
              <p className="text-xs text-gray-500 mb-2">
                Enter a URL (e.g., LinkedIn) or upload an image (will upload on save)
              </p>
              
              {profilePreview ? (
                // GridFS image preview
                <div className="flex items-center gap-4">
                  <Image
                    src={profilePreview}
                    alt="Profile preview"
                    width={80}
                    height={80}
                    className="rounded object-cover"
                  />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{profileFile?.name}</p>
                    <button
                      type="button"
                      onClick={() => {
                        if (profilePreview) {
                          URL.revokeObjectURL(profilePreview);
                        }
                        setProfileFile(null);
                        setProfilePreview("");
                        setProfileFileKey(prev => prev + 1);
                        if (profileFileRef.current) {
                          profileFileRef.current.value = "";
                        }
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : profileUrlText ? (
                // External URL
                <div className="flex gap-2">
                  <input
                    type="url"
                    className="flex-1 border rounded-md px-3 py-2"
                    value={profileUrlText}
                    onChange={(e) => setProfileUrlText(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                  />
                  <button
                    type="button"
                    onClick={() => setProfileUrlText("")}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                // No profile set - show both options
                <div className="space-y-2">
                  <input
                    type="url"
                    className="w-full border rounded-md px-3 py-2"
                    value={profileUrlText}
                    onChange={(e) => {
                      setProfileUrlText(e.target.value);
                      if (e.target.value) {
                        // Clear file when URL is entered
                        setProfileFile(null);
                        setProfilePreview("");
                        setProfileFileKey(prev => prev + 1);
                      }
                    }}
                    placeholder="https://linkedin.com/in/username or upload below"
                  />
                  <div className="text-center text-sm text-gray-500">OR</div>
                  <input
                    key={profileFileKey}
                    ref={profileFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfileUpload}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Details - Show for ALL users */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Additional Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Type <span className="text-red-600">*</span>
              </label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={contributorType}
                onChange={(e) => setContributorType(e.target.value as "student" | "staff")}
                required
              >
                <option value="student">Student</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            {contributorType === "student" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Branch <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value as "IT" | "ADS")}
                    required
                  >
                    <option value="IT">IT</option>
                    <option value="ADS">ADS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Year of Passing <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-md px-3 py-2"
                    value={yearOfPassing}
                    onChange={(e) => setYearOfPassing(e.target.value)}
                    placeholder="e.g., 2024"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Register Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-md px-3 py-2"
                    value={registerNo}
                    onChange={(e) => setRegisterNo(e.target.value)}
                    placeholder="e.g., 61781922110060 (14 digits)"
                    maxLength={14}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be exactly 14 digits</p>
                </div>
              </>
            )}

            {contributorType === "staff" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Staff Title <span className="text-red-600">*</span>
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={staffTitle}
                  onChange={(e) => setStaffTitle(e.target.value)}
                  required
                >
                  <option value="">Select title...</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Professor">Professor</option>
                  <option value="Head of Department">Head of Department</option>
                  <option value="Assistant Head of Department">Assistant Head of Department</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : message.type === 'warning'
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating User..." : "Create User"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Information Box */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>A random password will be generated automatically</li>
          <li>Login credentials will be sent to the user&apos;s email</li>
          <li>User must change password on first login</li>
          <li>&quot;Both&quot; role allows access to admin panel and contributor dashboard</li>
          <li>✨ Files are uploaded ONLY when you click &quot;Create User&quot; - no cleanup needed!</li>
        </ul>
      </div>
    </div>
  );
}
