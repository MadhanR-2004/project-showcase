export type MediaSource =
  | { kind: "youtube"; url: string; youtubeId?: string }
  | { kind: "gdrive"; url: string }
  | { kind: "onedrive"; url: string }
  | { kind: "upload"; fileId: string; contentType?: string };

export interface Contributor {
  id: string;
  name: string;
  email: string;
  contributorType?: "student" | "staff";
  branch?: "IT" | "ADS";
  staffTitle?: "Assistant Professor" | "Professor" | "Head of Department" | "Assistant Head of Department";
  yearOfPassing?: string;
  avatarUrl?: string;
  profileUrl?: string;
}

export interface Project {
  _id?: string;
  title: string;
  description: string; // plain text only
  shortDescription?: string;
  techStack?: string[]; // list of technologies used
  poster?: string; // GridFS file ID or URL
  thumbnail?: string; // small image used in lists/cards
  tags?: string[];
  media?: MediaSource;
  showcasePhotos?: Array<string>;
  contributors?: Array<Contributor & { projectRole?: "mentor" | "team-leader" | "team-member" | "project-head" }>;
  createdAt?: string;
  updatedAt?: string;
  isPublished?: boolean;
  order?: number;
}


