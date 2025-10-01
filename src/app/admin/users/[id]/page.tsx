"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

type User = {
  _id?: string;
  name: string;
  email: string;
  role: "admin" | "contributor" | "both";
  contributorType?: "student" | "staff";
  branch?: "IT" | "ADS";
  staffTitle?: "Assistant Professor" | "Professor" | "Head of Department" | "Assistant Head of Department";
  yearOfPassing?: string;
  registerNo?: string;
  avatarUrl?: string;
  profileUrl?: string;
};

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

export default function EditUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = useParams();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Store original URLs to track what needs deletion
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState<string>("");
  const [originalProfileUrl, setOriginalProfileUrl] = useState<string>("");
  
  // Upload-on-save approach: Store File objects, not URLs
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarUrlText, setAvatarUrlText] = useState<string>(""); // URL input
  const avatarFileRef = useRef<HTMLInputElement | null>(null);
  const [avatarFileKey, setAvatarFileKey] = useState(0);
  
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string>("");
  const [profileUrlText, setProfileUrlText] = useState<string>(""); // URL input
  const profileFileRef = useRef<HTMLInputElement | null>(null);
  const [profileFileKey, setProfileFileKey] = useState(0);
  
  // Track if user explicitly removed files (set to empty string on save)
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [profileRemoved, setProfileRemoved] = useState(false);

  const userRole = session?.user?.role;
  const isAdmin = userRole === "admin" || userRole === "both";

  // Prevent navigation during save
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saving) {
        e.preventDefault();
        e.returnValue = "Save in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saving]);

  useEffect(() => {
    if (!id || status === "loading") return;
    
    if (!isAdmin) {
      router.push("/admin/login");
      return;
    }

    // Fetch user data
    fetch(`/api/users/${id}`)
      .then((res) => res.ok ? res.json() : Promise.reject("Not found"))
      .then((data) => {
        setUser(data);
        setOriginalAvatarUrl(data.avatarUrl || "");
        setOriginalProfileUrl(data.profileUrl || "");
        setLoading(false);
      })
      .catch(() => {
        setError("User not found");
        setLoading(false);
      });
  }, [id, status, isAdmin, router]);
  
  // No cleanup needed! Files are only uploaded on save, not immediately

  if (status === "loading" || loading) {
    return <div className="min-h-screen p-6 max-w-3xl mx-auto">Loading...</div>;
  }
  
  if (!isAdmin) {
    return <div className="min-h-screen p-6 max-w-3xl mx-auto">Access denied.</div>;
  }

  if (error || !user) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error || "User not found"}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Go Back
        </button>
      </div>
    );
  }

  const showContributorFields = user.role === "contributor" || user.role === "both";

  // Upload-on-save: Just store file, don't upload yet
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarRemoved(false); // User selected new file, not removed
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    setAvatarRemoved(true); // Mark as explicitly removed
    setAvatarFileKey(prev => prev + 1);
    if (avatarFileRef.current) {
      avatarFileRef.current.value = "";
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
    setProfileRemoved(false); // User selected new file, not removed
  };

  const handleRemoveProfile = () => {
    setProfileFile(null);
    setProfilePreview("");
    setProfileRemoved(true); // Mark as explicitly removed
    setProfileFileKey(prev => prev + 1);
    if (profileFileRef.current) {
      profileFileRef.current.value = "";
    }
  };

  // Helper function to upload file to GridFS
  async function uploadToGridFS(file: File, signal?: AbortSignal) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
      signal,
    });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return `/api/media/${data.fileId}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user.name.trim() || !user.email.trim()) {
      setMessage({ type: 'error', text: 'Name and email are required' });
      return;
    }

    // Validate contributor fields if needed
    if (showContributorFields) {
      if (!user.contributorType) {
        setMessage({ type: 'error', text: 'Contributor type is required' });
        return;
      }
      if (user.contributorType === "student" && !user.branch) {
        setMessage({ type: 'error', text: 'Branch is required for students' });
        return;
      }
      if (user.contributorType === "student" && !user.yearOfPassing) {
        setMessage({ type: 'error', text: 'Year of passing is required for students' });
        return;
      }
      if (user.contributorType === "staff" && !user.staffTitle) {
        setMessage({ type: 'error', text: 'Staff title is required for staff' });
        return;
      }
    }

    setSaving(true);
    setMessage(null);

    // AbortController for cancellable uploads
    const abortController = new AbortController();
    
    // Track uploaded files for cleanup on failure
    const uploadedFiles: string[] = [];
    const filesToDelete: string[] = [];

    try {
      // Upload-on-save: Upload new files NOW
      let avatarUrl = user.avatarUrl || "";
      let profileUrl = user.profileUrl || "";

      // Handle avatar
      if (avatarFile) {
        // User selected a new avatar file
        avatarUrl = await uploadToGridFS(avatarFile, abortController.signal);
        uploadedFiles.push(avatarUrl);
        
        // Track old avatar for deletion (only after success)
        if (originalAvatarUrl && originalAvatarUrl.startsWith("/api/media/")) {
          filesToDelete.push(originalAvatarUrl);
        }
      } else if (avatarUrlText) {
        // User provided a URL
        avatarUrl = avatarUrlText;
        
        // Track old avatar for deletion (only after success)
        if (originalAvatarUrl && originalAvatarUrl.startsWith("/api/media/")) {
          filesToDelete.push(originalAvatarUrl);
        }
      } else if (avatarRemoved) {
        // User explicitly removed avatar
        avatarUrl = "";
        if (originalAvatarUrl && originalAvatarUrl.startsWith("/api/media/")) {
          filesToDelete.push(originalAvatarUrl);
        }
      }
      // else: Keep existing avatarUrl (no change)

      // Handle profile
      if (profileFile) {
        // User selected a new profile file
        profileUrl = await uploadToGridFS(profileFile, abortController.signal);
        uploadedFiles.push(profileUrl);
        
        // Track old profile for deletion (only after success)
        if (originalProfileUrl && originalProfileUrl.startsWith("/api/media/")) {
          filesToDelete.push(originalProfileUrl);
        }
      } else if (profileUrlText) {
        // User provided a URL
        profileUrl = profileUrlText;
        
        // Track old profile for deletion (only after success)
        if (originalProfileUrl && originalProfileUrl.startsWith("/api/media/")) {
          filesToDelete.push(originalProfileUrl);
        }
      } else if (profileRemoved) {
        // User explicitly removed profile
        profileUrl = "";
        if (originalProfileUrl && originalProfileUrl.startsWith("/api/media/")) {
          filesToDelete.push(originalProfileUrl);
        }
      }
      // else: Keep existing profileUrl (no change)

      // Send update with new URLs
      const updateData = {
        ...user,
        avatarUrl,
        profileUrl,
      };

      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (!res.ok) {
        // API call failed - rollback uploaded files
        console.error("User update failed, rolling back uploaded files...");
        await Promise.all(uploadedFiles.map((url: string) => handleDeleteFile(url)));
        throw new Error(data.error || "Failed to update user");
      }

      setMessage({ type: 'success', text: 'User updated successfully' });
      
      // Success! Now delete old files that were replaced/removed
      if (filesToDelete.length > 0) {
        console.log("Update successful, cleaning up old files...", filesToDelete);
        await Promise.all(filesToDelete.map((url: string) => handleDeleteFile(url)));
      }
      
      // Update state to reflect new values
      setUser({ ...user, avatarUrl, profileUrl });
      setOriginalAvatarUrl(avatarUrl);
      setOriginalProfileUrl(profileUrl);
      
      // Clear file states
      setAvatarFile(null);
      setAvatarPreview("");
      setAvatarRemoved(false);
      setProfileFile(null);
      setProfilePreview("");
      setProfileRemoved(false);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/admin");
      }, 2000);
    } catch (error) {
      console.error("Error updating user:", error);
      
      // Rollback: Delete any files that were uploaded
      if (uploadedFiles.length > 0) {
        console.error("Update failed, rolling back uploaded files...", uploadedFiles);
        await Promise.all(uploadedFiles.map((url: string) => handleDeleteFile(url)));
      }
      
      // Handle abort gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Upload cancelled by user');
        setMessage({ type: 'error', text: 'Upload cancelled' });
      } else {
        setMessage({ 
          type: 'error', 
          text: error instanceof Error ? error.message : 'Failed to update user'
        });
      }
    } finally {
      setSaving(false);
    }
  };  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
  };

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit User</h1>
        <p className="text-gray-600 mt-1">Update user information and role</p>
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
                name="name"
                className="w-full border rounded-md px-3 py-2"
                value={user.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                name="email"
                className="w-full border rounded-md px-3 py-2 bg-gray-100"
                value={user.email}
                disabled
                title="Email cannot be changed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Role <span className="text-red-600">*</span>
              </label>
              <select
                name="role"
                className="w-full border rounded-md px-3 py-2"
                value={user.role}
                onChange={handleChange}
                required
              >
                <option value="admin">Admin Only</option>
                <option value="contributor">Contributor Only</option>
                <option value="both">Both (Admin + Contributor)</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                {user.role === "admin" && "Can access admin panel only"}
                {user.role === "contributor" && "Can access contributor dashboard only"}
                {user.role === "both" && "Can access both admin panel and contributor dashboard"}
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
              
              {/* Show current avatar with remove option */}
              {(avatarPreview || user.avatarUrl) && !avatarRemoved ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Image
                      src={avatarPreview || user.avatarUrl || ""}
                      alt="Avatar preview"
                      width={80}
                      height={80}
                      className="rounded-full object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                    {avatarFile && (
                      <p className="text-sm text-blue-600">New file selected (will upload on save)</p>
                    )}
                  </div>
                </div>
              ) : (
                // No avatar - show upload or URL input
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      key={avatarFileKey}
                      ref={avatarFileRef}
                      type="file"
                      accept="image/*"
                      disabled={!!avatarUrlText}
                      onChange={handleAvatarChange}
                      className="flex-1 border rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">OR</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="Enter image URL (e.g., https://example.com/avatar.jpg)"
                      className="flex-1 border rounded-md px-3 py-2"
                      value={avatarUrlText}
                      disabled={!!avatarFile}
                      onChange={(e) => setAvatarUrlText(e.target.value)}
                    />
                    {avatarUrlText && (
                      <button
                        type="button"
                        className="text-red-600 px-2"
                        onClick={() => setAvatarUrlText("")}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  {avatarUrlText && (
                    <div className="flex items-center gap-2">
                      <Image
                        src={avatarUrlText}
                        alt="URL Preview"
                        width={48}
                        height={48}
                        className="w-12 h-12 object-cover rounded-full border"
                        unoptimized
                      />
                      <span className="text-xs text-blue-600">Using URL (no upload needed)</span>
                    </div>
                  )}
                </div>
              )}
              {avatarRemoved && !avatarFile && (
                <p className="text-sm text-orange-600 mt-1">
                  ⚠️ Avatar will be removed when you save.
                </p>
              )}
            </div>

            {/* Profile URL / Image */}
            <div>
              <label className="block text-sm font-medium mb-1">Profile URL or Image</label>
              <p className="text-xs text-gray-500 mb-2">
                Enter a URL (e.g., LinkedIn) or upload an image
              </p>
              
              {/* Show current profile with remove option */}
              {(profilePreview || user.profileUrl) && !profileRemoved ? (
                (user.profileUrl && user.profileUrl.startsWith("/api/media/")) || profilePreview ? (
                  // GridFS image
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Image
                        src={profilePreview || user.profileUrl || ""}
                        alt="Profile preview"
                        width={80}
                        height={80}
                        className="rounded object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={handleRemoveProfile}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                      {profileFile && (
                        <p className="text-sm text-blue-600">New file selected (will upload on save)</p>
                      )}
                    </div>
                  </div>
                ) : (
                  // External URL
                  <div className="flex gap-2">
                    <input
                      type="url"
                      className="flex-1 border rounded-md px-3 py-2"
                      value={user.profileUrl}
                      disabled
                      placeholder="https://linkedin.com/in/username"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveProfile}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Clear
                    </button>
                  </div>
                )
              ) : (
                // No profile - show upload or URL input
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      key={profileFileKey}
                      ref={profileFileRef}
                      type="file"
                      accept="image/*"
                      disabled={!!profileUrlText}
                      onChange={handleProfileChange}
                      className="flex-1 border rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">OR</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="Enter image/profile URL (e.g., https://linkedin.com/in/username)"
                      className="flex-1 border rounded-md px-3 py-2"
                      value={profileUrlText}
                      disabled={!!profileFile}
                      onChange={(e) => setProfileUrlText(e.target.value)}
                    />
                    {profileUrlText && (
                      <button
                        type="button"
                        className="text-red-600 px-2"
                        onClick={() => setProfileUrlText("")}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  {profileUrlText && profileUrlText.startsWith("http") && (
                    <div className="flex items-center gap-2">
                      {profileUrlText.includes('/api/media/') || profileUrlText.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <>
                          <Image
                            src={profileUrlText}
                            alt="URL Preview"
                            width={48}
                            height={48}
                            className="w-12 h-12 object-cover rounded border"
                            unoptimized
                          />
                          <span className="text-xs text-blue-600">Using image URL (no upload needed)</span>
                        </>
                      ) : (
                        <span className="text-xs text-blue-600">Using profile URL: {profileUrlText}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {profileRemoved && !profileFile && (
                <p className="text-sm text-orange-600 mt-1">
                  ⚠️ Profile will be removed when you save.
                </p>
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
                name="contributorType"
                className="w-full border rounded-md px-3 py-2"
                value={user.contributorType || "student"}
                onChange={handleChange}
                required
              >
                <option value="student">Student</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            {user.contributorType === "student" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Branch <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="branch"
                    className="w-full border rounded-md px-3 py-2"
                    value={user.branch || "IT"}
                    onChange={handleChange}
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
                    name="yearOfPassing"
                    className="w-full border rounded-md px-3 py-2"
                    value={user.yearOfPassing || ""}
                    onChange={handleChange}
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
                    name="registerNo"
                    className="w-full border rounded-md px-3 py-2"
                    value={user.registerNo || ""}
                    onChange={handleChange}
                    placeholder="e.g., 61781922110060 (14 digits)"
                    maxLength={14}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Must be exactly 14 digits</p>
                </div>
              </>
            )}

            {user.contributorType === "staff" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Staff Title <span className="text-red-600">*</span>
                </label>
                <select
                  name="staffTitle"
                  className="w-full border rounded-md px-3 py-2"
                  value={user.staffTitle || ""}
                  onChange={handleChange}
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
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
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
        <h3 className="font-medium text-blue-900 mb-2">Important Notes:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Email address cannot be changed</li>
          <li>Changing avatar or profile image will cleanup old files automatically</li>
          <li>Profile URL can be external (LinkedIn) or uploaded image</li>
          <li>Role changes affect which panels the user can access</li>
          <li>GridFS files are tracked and cleaned up when no longer referenced</li>
        </ul>
      </div>
    </div>
  );
}
