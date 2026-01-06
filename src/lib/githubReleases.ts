// GitHub Releases API integration for APK hosting
// Replace with your actual GitHub repository details
const GITHUB_OWNER = "YOUR_GITHUB_USERNAME";
const GITHUB_REPO = "YOUR_REPO_NAME";
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  html_url: string;
  assets: GitHubAsset[];
}

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  download_count: number;
}

export interface VersionInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl: string;
  minAndroidVersion?: string;
  fileSize?: number;
  downloadCount?: number;
}

// Parse version from tag (e.g., "v1.1.0" -> "1.1.0")
const parseVersion = (tagName: string): string => {
  return tagName.replace(/^v/, "");
};

// Find APK asset from release assets
const findApkAsset = (assets: GitHubAsset[]): GitHubAsset | null => {
  return assets.find((asset) => asset.name.endsWith(".apk")) || null;
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Fetch latest release from GitHub
export const fetchLatestRelease = async (): Promise<VersionInfo | null> => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/latest`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      console.error("GitHub API error:", response.status);
      return null;
    }

    const release: GitHubRelease = await response.json();
    const apkAsset = findApkAsset(release.assets);

    if (!apkAsset) {
      console.warn("No APK asset found in latest release");
      return null;
    }

    return {
      version: parseVersion(release.tag_name),
      releaseDate: release.published_at.split("T")[0],
      releaseNotes: release.body || "No release notes provided.",
      downloadUrl: apkAsset.browser_download_url,
      fileSize: apkAsset.size,
      downloadCount: apkAsset.download_count,
    };
  } catch (error) {
    console.error("Failed to fetch latest release:", error);
    return null;
  }
};

// Fetch all releases from GitHub
export const fetchAllReleases = async (): Promise<VersionInfo[]> => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}?per_page=20`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      console.error("GitHub API error:", response.status);
      return [];
    }

    const releases: GitHubRelease[] = await response.json();

    return releases
      .filter((release) => findApkAsset(release.assets))
      .map((release) => {
        const apkAsset = findApkAsset(release.assets)!;
        return {
          version: parseVersion(release.tag_name),
          releaseDate: release.published_at.split("T")[0],
          releaseNotes: release.body || "No release notes provided.",
          downloadUrl: apkAsset.browser_download_url,
          fileSize: apkAsset.size,
          downloadCount: apkAsset.download_count,
        };
      });
  } catch (error) {
    console.error("Failed to fetch releases:", error);
    return [];
  }
};

// Check if GitHub releases are configured
export const isGitHubReleasesConfigured = (): boolean => {
  return GITHUB_OWNER !== "YOUR_GITHUB_USERNAME" && GITHUB_REPO !== "YOUR_REPO_NAME";
};

// Get the GitHub repo configuration
export const getGitHubConfig = () => ({
  owner: GITHUB_OWNER,
  repo: GITHUB_REPO,
  isConfigured: isGitHubReleasesConfigured(),
});
