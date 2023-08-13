export interface SessionInfo {
    data: {
      sid: string;
    };
    success: boolean;
  }

export interface TasksResponse {
    data: Data;
    success: boolean;
  }
  export interface Data {
    offset: number;
    tasks?: (TasksEntity)[] | null;
    total: number;
  }
  export interface TasksEntity {
    additional: Additional;
    id: string;
    size: number;
    status: string;
    title: string;
    type: string;
    username: string;
    status_extra?: StatusExtra | null;
  }
  export interface Additional {
    detail: Detail;
    transfer: Transfer;
  }
  export interface Detail {
    completed_time: number;
    connected_leechers: number;
    connected_peers: number;
    connected_seeders: number;
    create_time: number;
    destination: string;
    seedelapsed: number;
    started_time: number;
    total_peers: number;
    total_pieces: number;
    unzip_password: string;
    uri: string;
    waiting_seconds: number;
  }
  export interface Transfer {
    downloaded_pieces: number;
    size_downloaded: number;
    size_uploaded: number;
    speed_download: number;
    speed_upload: number;
  }
  export interface StatusExtra {
    error_detail: string;
  }
  