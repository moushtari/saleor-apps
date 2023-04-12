import { useChannelsFetch } from "./useChannelsFetch";
import { MergedChannelSchema, SingleChannelSchema } from "../../../../lib/cms/config";
import { useChannelsQuery } from "../../../../../generated/graphql";
import { useIsMounted } from "usehooks-ts";
import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";

export interface ChannelsDataLoading {
  fetching: boolean;
  saving: boolean;
}

export interface ChannelsDataErrors {
  fetching?: Error | null;
  saving?: Error | null;
}

export const useChannels = () => {
  const { appBridge } = useAppBridge();
  const isMounted = useIsMounted();
  const [channelsQueryData, channelsQueryOpts] = useChannelsQuery({
    pause: !isMounted,
  });
  const {
    saveChannel: saveChannelFetch,
    isSaving,
    data: settings,
    error: fetchingError,
    isFetching,
  } = useChannelsFetch();

  const saveChannel = async (channelToSave: SingleChannelSchema) => {
    console.log("saveChannel", channelToSave);

    const currentlyEnabledProviderInstances =
      settings?.[`${channelToSave.channelSlug}`]?.enabledProviderInstances || [];
    const toEnableProviderInstances = channelToSave.enabledProviderInstances || [];

    const changedSyncProviderInstances = [
      ...currentlyEnabledProviderInstances.filter(
        (instance) => !toEnableProviderInstances.includes(instance)
      ),
      ...toEnableProviderInstances.filter(
        (instance) => !currentlyEnabledProviderInstances.includes(instance)
      ),
    ];

    const fetchResult = await saveChannelFetch({
      ...channelToSave,
      requireSyncProviderInstances: [
        ...(channelToSave.requireSyncProviderInstances || []),
        ...changedSyncProviderInstances.filter(
          (instance) => !(channelToSave.requireSyncProviderInstances || []).includes(instance)
        ),
      ],
    });

    if (fetchResult.success) {
      appBridge?.dispatch(
        actions.Notification({
          title: "Success",
          status: "success",
          text: "Configuration saved",
        })
      );
    } else {
      appBridge?.dispatch(
        actions.Notification({
          title: "Error",
          status: "error",
          text: "Error while saving configuration",
        })
      );
    }
  };

  const loading: ChannelsDataLoading = {
    fetching: isFetching || channelsQueryData.fetching,
    saving: isSaving,
  };

  const errors: ChannelsDataErrors = {
    fetching: fetchingError ? Error(fetchingError) : null,
    saving: null,
  };

  const channels =
    channelsQueryData.data?.channels?.map(
      (channel) =>
        ({
          channelSlug: channel.slug,
          enabledProviderInstances: settings
            ? settings[`${channel.slug}`]?.enabledProviderInstances
            : [],
          requireSyncProviderInstances: settings
            ? settings[`${channel.slug}`]?.requireSyncProviderInstances
            : [],
          channel: channel,
        } as MergedChannelSchema)
    ) || [];

  return { channels, saveChannel, loading, errors };
};
