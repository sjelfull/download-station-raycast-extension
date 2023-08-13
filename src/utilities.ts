import { TasksEntity } from "./types";

const BASE_URL = "http://YOUR_SYNOLOGY_IP:PORT/webapi/";

const statusPriorities: { [status: string]: number } = {
  all: 1,
  downloading: 2,
  paused: 3,
  completed: 4,
  error: 5,
  waiting: 5,
};

export function groupByStatus(downloads: TasksEntity[]) {
  const grouped = downloads.reduce<Record<string, TasksEntity[]>>((acc, download) => {
    const status = download.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(download);

    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([statusA], [statusB]) => {
      const priorityA = statusPriorities[statusA];
      const priorityB = statusPriorities[statusB];
      return priorityA - priorityB;
    })
    .reduce<Record<string, TasksEntity[]>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
}

export function bytesToSize(bytes: number, precision: number = 0): string {
  if (bytes < 0) return "Invalid Size"; // or handle as per your need
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  if (bytes === 0) return "0 Bytes";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString(), 10);
  if (i < 0) return "0 Bytes";
  return (bytes / Math.pow(1024, i)).toFixed(precision) + " " + sizes[i];
}

export function formatSpeed(bytesPerSecond: number): string {
  const speeds = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];

  if (bytesPerSecond === 0) return "0 B/s";
  const i = parseInt(Math.floor(Math.log(bytesPerSecond) / Math.log(1024)).toString(), 10);
  if (i < 0) return "0 B/s"; // In case bytesPerSecond is between 0 and 1.
  return (bytesPerSecond / Math.pow(1024, i)).toFixed(2) + " " + speeds[i];
}

export function calculateDownloadProgress(downloaded: number, fileSize: number): string {
  if (downloaded === 0 || fileSize === 0) return `0%`;

  const progress = (downloaded / fileSize) * 100;
  return `${parseFloat(progress.toFixed(2)).toString()}%`; // You can adjust the precision as needed
}

// // Authenticate and get the SID
// export const authenticate = async (account, password) => {
//   const response = await fetch(`${BASE_URL}auth.cgi?api=SYNO.API.Auth&version=2&method=login&account=${account}&passwd=${password}&session=DownloadStation&format=sid`);
//   const data = await response.json();
//   return data.data.sid; // you should handle errors here too
// };

// // List active downloads
// export const listDownloads = async (sid) => {
//   const response = await fetch(`${BASE_URL}DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=list&_sid=${sid}`);
//   return await response.json();
// };

// // Add a new download
// export const addDownload = async (sid, uri) => {
//   const formData = new FormData();
//   formData.append('api', 'SYNO.DownloadStation.Task');
//   formData.append('version', '1');
//   formData.append('method', 'create');
//   formData.append('uri', uri);

//   const response = await fetch(`${BASE_URL}DownloadStation/task.cgi`, {
//     method: 'POST',
//     body: formData,
//     headers: {
//       'Cookie': `id=${sid}`
//     }
//   });

//   return await response.json();
// };

// // Pause or start downloads
// export const toggleDownload = async (sid, id, action = 'resume') => {
//   const formData = new FormData();
//   formData.append('api', 'SYNO.DownloadStation.Task');
//   formData.append('version', '1');
//   formData.append('method', action);
//   formData.append('id', id);

//   const response = await fetch(`${BASE_URL}DownloadStation/task.cgi`, {
//     method: 'POST',
//     body: formData,
//     headers: {
//       'Cookie': `id=${sid}`
//     }
//   });

//   return await response.json();
// };
