import { ActionPanel, Detail, List, Action, getPreferenceValues, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import React, { useEffect, useMemo, useState } from "react";
import { SessionInfo, TasksEntity, TasksResponse } from "./types";
import { bytesToSize, calculateDownloadProgress, formatSpeed, groupByStatus } from "./utilities";

const parse = (data: any) => {
  if (typeof data === "string") {
    return JSON.parse(data);
  }

  return data;
};

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(false);
  const { hostname, username, password } = getPreferenceValues<Preferences.Index>();
  const endpoint = `${hostname}/webapi/auth.cgi?api=SYNO.API.Auth&version=2&method=login&account=${username}&passwd=${password}&session=DownloadStation&format=sid`;
  // TODO When returned from cache, the JSON is a string. Maybe the parser callback option should be able to handle that?
  const { data: sessionInfo, isLoading, revalidate } = useFetch<SessionInfo>(endpoint);
  const [sid, setSid] = useState<string | undefined>(parse(sessionInfo)?.data?.sid);

  const {
    data: taskList,
    revalidate: refetchList,
    isLoading: isLoadingList,
  } = useFetch<TasksResponse>(
    `${hostname}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=list&additional=detail,transfer,tracker,file&offset=0&limit=-1&sort_by=completed_time&sort_direction=desc&_sid=${sid}`,
    {
      execute: false,
    }
  );

  const [list, setList] = useState<TasksEntity[]>(parse(taskList)?.data?.tasks || []);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState<Record<string, TasksEntity[]>>(groupByStatus(list) || {});
  const onToggleDetail = () => {
    setShowingDetail(!showingDetail);
  };
  const onStatusFilterChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
  };

  // useEffect(() => {
  //   console.log(sessionInfo, 'sessionInfo on mount');
  //   // revalidate();
  //   if (sessionInfo) {
  //     const parsed = parse(sessionInfo)
  //     console.log('setting sid', parsed)
  //     setSid(parsed?.data.sid)
  //     refetchList()
  //   }

  //   refetchList()
  //   }, [])

  const filterCallback = (task: TasksEntity) => {
    const matchStatus = selectedStatus === "all" || task.status === selectedStatus;
    const matchTitle = searchText === "" || task.title.toLowerCase().includes(searchText);

    return matchTitle && matchStatus;
  };

  useEffect(() => {
    const grouped = groupByStatus(list?.filter(filterCallback) || []);
    filterList(grouped);
    setStatuses(["all", ...Object.keys(grouped)]);
  }, [list]);

  useEffect(() => {
    const grouped = groupByStatus(list?.filter(filterCallback) || []);
    filterList(grouped);
  }, [searchText, selectedStatus]);

  useEffect(() => {
    if (sid) {
      refetchList();
    }
  }, []);

  useEffect(() => {
    console.log(sessionInfo, typeof sessionInfo, "sessionInfo");
    if (sessionInfo) {
      const parsed = parse(sessionInfo);
      setSid(parsed?.data.sid);
      refetchList();
    }
  }, [sessionInfo]);

  useEffect(() => {
    if (taskList) {
      setList(parse(taskList)?.data?.tasks);
    }
  }, [taskList]);

  useEffect(() => {
    console.log("list", list);
  }, [list]);

  return (
    <List
      searchBarPlaceholder="Search downloads by title..."
      onSearchTextChange={(newValue) => setSearchText(newValue)}
      isLoading={isLoading || isLoadingList}
      isShowingDetail={showingDetail}
      searchBarAccessory={<StatusFilterDropdown statuses={statuses} onStatusFilterChange={onStatusFilterChange} />}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => refetchList()} />
        </ActionPanel>
      }
    >
      {Object.entries(filteredList).map(([groupKey, tasks]) => (
        <List.Section key={groupKey} title={`${groupKey.substring(0, 1).toLocaleUpperCase()}${groupKey.substring(1)}`}>
          {tasks.map((task) => (
            <DownloadEntry key={task.id} task={task} onToggleDetail={onToggleDetail} showingDetail={showingDetail} />
          ))}
        </List.Section>
      ))}
      {/* <List.Item
        icon="list-icon.png"
        title="Greeting"
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} />
          </ActionPanel>
        }
      /> */}
    </List>
  );
}

function StatusFilterDropdown(props: { statuses: string[]; onStatusFilterChange: (newValue: string) => void }) {
  const { statuses, onStatusFilterChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Status"
      storeValue={true}
      onChange={(newValue) => {
        onStatusFilterChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Status">
        {statuses.map((status) => (
          <List.Dropdown.Item
            key={`status-${status}`}
            title={`${status.substring(0, 1).toLocaleUpperCase()}${status.substring(1)}`}
            value={status}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function formatValue(value: any): string {
  if (typeof value === "number") {
    // Assuming value in bytes for filesize. Adjust as needed.
    return bytesToSize(value);
  }
  return value.toString();
}

function DownloadEntry({
  task,
  onToggleDetail,
  showingDetail,
}: {
  task: TasksEntity;
  onToggleDetail: () => void;
  showingDetail: boolean;
}) {
  const formatMetadata = useMemo(() => {
    const { detail, transfer } = task.additional;

    const metadataArray = [];

    // metadataArray.push({
    //     title: "Detail",
    //     value: formatValue(detail),
    // });

    metadataArray.push({
      title: "Downloaded",
      value: `${formatValue(transfer.size_downloaded)} / ${formatValue(task.size)}`,
    });

    metadataArray.push({
      title: "Progress",
      value: calculateDownloadProgress(transfer.size_downloaded, task.size),
    });

    metadataArray.push({
      title: "Size Uploaded",
      value: formatValue(transfer.size_uploaded),
    });

    metadataArray.push({
      title: "Speed",
      value: `${formatSpeed(transfer.speed_download)} (D) / ${formatSpeed(transfer.speed_upload)} (U)`,
    });

    metadataArray.push({
      title: "Peers/Seeders",
      value: `${detail.connected_peers} / ${detail.connected_seeders}`,
    });

    // metadataArray.push({
    //     title: "File Size",
    //     value: formatValue(task.size),
    // });

    metadataArray.push({
      title: "Destination",
      value: task.additional.detail.destination,
    });

    return metadataArray;
  }, [task]);

  const props: Partial<List.Item.Props> = showingDetail
    ? {
        detail: (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                {formatMetadata.map((item, index) => (
                  <React.Fragment key={index}>
                    <List.Item.Detail.Metadata.Label title={item.title} text={item.value} />
                    {index !== formatMetadata.length - 1 && <List.Item.Detail.Metadata.Separator />}
                  </React.Fragment>
                ))}
              </List.Item.Detail.Metadata>
            }
            markdown={`\n\n`}
          />
        ),
      }
    : {
        accessories: [
          {
            text: [
              // bytesToSize(task.size),
              `${calculateDownloadProgress(task.additional.transfer.size_downloaded, task.size)} of ${bytesToSize(
                task.size
              )}`,
            ].join(" "),
          },
        ],
      };

  return (
    <List.Item
      icon={statusToIcon(task.status)}
      title={task.title}
      subtitle={task.status}
      {...props}
      actions={
        <ActionPanel>
          <Action title="Toggle Detail" onAction={() => onToggleDetail()} />
        </ActionPanel>
      }
    />
  );
}


function statusToIcon(status: string) {
  switch (status) {
    case "downloading":
      return Icon.Download;
    case "paused":
      return Icon.Pause;
    case "finished":
      return Icon.Checkmark;
    case "seeding":
      return Icon.Play;
    case "waiting":
      return Icon.QuestionMark;
    case "error":
      return Icon.Warning;
    default:
      return Icon.Play;
  }
}