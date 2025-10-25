import Alert from '@app/components/Common/Alert';
import Modal from '@app/components/Common/Modal';
import type { RequestOverrides } from '@app/components/RequestModal/AdvancedRequester';
import AdvancedRequester from '@app/components/RequestModal/AdvancedRequester';
import QuotaDisplay from '@app/components/RequestModal/QuotaDisplay';
import type { MusicArtist } from '@app/hooks/useMusic';
import { useUser } from '@app/hooks/useUser';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import { MediaStatus } from '@server/constants/media';
import type { MediaRequest } from '@server/entity/MediaRequest';
import type { NonFunctionProperties } from '@server/interfaces/api/common';
import type { QuotaResponse } from '@server/interfaces/api/userInterfaces';
import { Permission } from '@server/lib/permissions';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';
import useSWR, { mutate } from 'swr';

const messages = defineMessages('components.RequestModal.MusicRequestModal', {
  requestadmin: 'This request will be approved automatically.',
  requestSuccess: '<strong>{title}</strong> requested successfully!',
  requestCancel: 'Request for <strong>{title}</strong> canceled.',
  requestmusictitle: 'Request Artist',
  edit: 'Edit Request',
  approve: 'Approve Request',
  cancel: 'Cancel Request',
  pendingrequest: 'Pending Artist Request',
  requestfrom: "{username}'s request is pending approval.",
  errorediting: 'Something went wrong while editing the request.',
  requestedited: 'Request for <strong>{title}</strong> edited successfully!',
  requestApproved: 'Request for <strong>{title}</strong> approved!',
  requesterror: 'Something went wrong while submitting the request.',
  pendingapproval: 'Your request is pending approval.',
});

interface RequestModalProps extends React.HTMLAttributes<HTMLDivElement> {
  tmdbId: number;
  editRequest?: NonFunctionProperties<MediaRequest>;
  onCancel?: () => void;
  onComplete?: (newStatus: MediaStatus) => void;
  onUpdating?: (isUpdating: boolean) => void;
}

const MusicRequestModal = ({
  onCancel,
  onComplete,
  tmdbId,
  onUpdating,
  editRequest,
}: RequestModalProps) => {
  // For music, tmdbId is actually the artist ID (convert back to string for MusicBrainz UUID)
  const artistId = String(tmdbId);
  const [isUpdating, setIsUpdating] = useState(false);
  const [requestOverrides, setRequestOverrides] =
    useState<RequestOverrides | null>(null);
  const { addToast } = useToasts();
  const { data, error } = useSWR<MusicArtist>(`/api/v1/music/${artistId}`, {
    revalidateOnMount: true,
  });
  const intl = useIntl();
  const { user, hasPermission } = useUser();
  const { data: quota } = useSWR<QuotaResponse>(
    user &&
      (!requestOverrides?.user?.id || hasPermission(Permission.MANAGE_USERS))
      ? `/api/v1/user/${requestOverrides?.user?.id ?? user.id}/quota`
      : null
  );

  useEffect(() => {
    if (onUpdating) {
      onUpdating(isUpdating);
    }
  }, [isUpdating, onUpdating]);

  const sendRequest = useCallback(async () => {
    setIsUpdating(true);

    try {
      let overrideParams = {};
      if (requestOverrides) {
        overrideParams = {
          serverId: requestOverrides.server,
          profileId: requestOverrides.profile,
          rootFolder: requestOverrides.folder,
          userId: requestOverrides.user?.id,
          tags: requestOverrides.tags,
        };
      }
      const response = await axios.post<MediaRequest>('/api/v1/request', {
        mediaId: data?.mediaInfo?.id,
        mediaType: 'music',
        ...overrideParams,
      });
      mutate('/api/v1/request?filter=all&take=10&sort=modified&skip=0');
      mutate('/api/v1/request/count');

      if (data) {
        addToast(
          <span>
            {intl.formatMessage(messages.requestSuccess, {
              title: data.name,
              strong: (msg: React.ReactNode) => <strong>{msg}</strong>,
            })}
          </span>,
          { appearance: 'success', autoDismiss: true }
        );
      }

      setIsUpdating(false);
      if (onComplete) {
        onComplete(response.data.media.status);
      }
    } catch (e) {
      setIsUpdating(false);
      addToast(intl.formatMessage(messages.requesterror), {
        appearance: 'error',
        autoDismiss: true,
      });
    }
  }, [data, requestOverrides, onComplete, addToast, intl]);

  const cancelRequest = useCallback(async () => {
    setIsUpdating(true);

    try {
      await axios.delete(`/api/v1/request/${editRequest?.id}`);
      mutate('/api/v1/request?filter=all&take=10&sort=modified&skip=0');
      mutate('/api/v1/request/count');

      if (data) {
        addToast(
          <span>
            {intl.formatMessage(messages.requestCancel, {
              title: data.name,
              strong: (msg: React.ReactNode) => <strong>{msg}</strong>,
            })}
          </span>,
          { appearance: 'success', autoDismiss: true }
        );
      }

      setIsUpdating(false);
      if (onComplete) {
        onComplete(MediaStatus.UNKNOWN);
      }
    } catch (e) {
      setIsUpdating(false);
      addToast(intl.formatMessage(messages.requesterror), {
        appearance: 'error',
        autoDismiss: true,
      });
    }
  }, [editRequest, data, onComplete, addToast, intl]);

  const updateRequest = useCallback(async () => {
    setIsUpdating(true);

    try {
      await axios.put(`/api/v1/request/${editRequest?.id}`, {
        mediaType: 'music',
        serverId: requestOverrides?.server,
        profileId: requestOverrides?.profile,
        rootFolder: requestOverrides?.folder,
        userId: requestOverrides?.user?.id,
        tags: requestOverrides?.tags,
      });

      mutate('/api/v1/request?filter=all&take=10&sort=modified&skip=0');

      if (data) {
        addToast(
          <span>
            {intl.formatMessage(messages.requestedited, {
              title: data.name,
              strong: (msg: React.ReactNode) => <strong>{msg}</strong>,
            })}
          </span>,
          { appearance: 'success', autoDismiss: true }
        );
      }

      setIsUpdating(false);
      if (onComplete) {
        onComplete(MediaStatus.PENDING);
      }
    } catch (e) {
      setIsUpdating(false);
      addToast(intl.formatMessage(messages.errorediting), {
        appearance: 'error',
        autoDismiss: true,
      });
    }
  }, [editRequest, data, requestOverrides, onComplete, addToast, intl]);

  const approveRequest = useCallback(async () => {
    setIsUpdating(true);

    try {
      await axios.post(`/api/v1/request/${editRequest?.id}/approve`, {
        mediaType: 'music',
      });

      mutate('/api/v1/request?filter=all&take=10&sort=modified&skip=0');
      mutate('/api/v1/request/count');

      if (data) {
        addToast(
          <span>
            {intl.formatMessage(messages.requestApproved, {
              title: data.name,
              strong: (msg: React.ReactNode) => <strong>{msg}</strong>,
            })}
          </span>,
          { appearance: 'success', autoDismiss: true }
        );
      }

      setIsUpdating(false);
      if (onComplete) {
        onComplete(MediaStatus.PROCESSING);
      }
    } catch (e) {
      setIsUpdating(false);
      addToast(intl.formatMessage(messages.requesterror), {
        appearance: 'error',
        autoDismiss: true,
      });
    }
  }, [editRequest, data, onComplete, addToast, intl]);

  const isOwner = editRequest && user && editRequest.requestedBy.id === user.id;
  const userQuotaMusic = quota?.music;

  return (
    <Modal
      loading={!data && !error}
      backgroundClickable
      onCancel={onCancel}
      onOk={
        editRequest && hasPermission(Permission.MANAGE_REQUESTS)
          ? () => approveRequest()
          : () => sendRequest()
      }
      title={
        editRequest
          ? hasPermission(Permission.MANAGE_REQUESTS)
            ? intl.formatMessage(messages.approve)
            : intl.formatMessage(messages.edit)
          : intl.formatMessage(messages.requestmusictitle)
      }
      okText={
        editRequest
          ? hasPermission(Permission.MANAGE_REQUESTS)
            ? intl.formatMessage(messages.approve)
            : intl.formatMessage(globalMessages.save)
          : intl.formatMessage(globalMessages.request)
      }
      okDisabled={
        isUpdating ||
        (hasPermission(Permission.MANAGE_REQUESTS) &&
          !requestOverrides &&
          !!editRequest) ||
        (!editRequest &&
          userQuotaMusic?.restricted &&
          (userQuotaMusic.remaining ?? 0) <= 0)
      }
      cancelText={
        editRequest && isOwner
          ? intl.formatMessage(messages.cancel)
          : intl.formatMessage(globalMessages.close)
      }
      onSecondary={
        editRequest && isOwner
          ? () => cancelRequest()
          : hasPermission(Permission.MANAGE_REQUESTS) && editRequest
          ? () => updateRequest()
          : undefined
      }
      secondaryText={
        hasPermission(Permission.MANAGE_REQUESTS) && editRequest
          ? intl.formatMessage(globalMessages.save)
          : undefined
      }
      secondaryDisabled={
        isUpdating ||
        (hasPermission(Permission.MANAGE_REQUESTS) && !requestOverrides)
      }
      okButtonType="primary"
    >
      {editRequest ? (
        <div className="request-modal-content">
          <Alert
            title={intl.formatMessage(messages.pendingrequest)}
            type="info"
          >
            {intl.formatMessage(messages.requestfrom, {
              username: editRequest.requestedBy.displayName,
            })}
          </Alert>
        </div>
      ) : (
        <>
          {hasPermission(
            [
              Permission.AUTO_APPROVE,
              Permission.AUTO_APPROVE_MUSIC,
              Permission.MANAGE_REQUESTS,
            ],
            { type: 'or' }
          ) && (
            <Alert
              title={intl.formatMessage(messages.requestadmin)}
              type="info"
            />
          )}
          {!hasPermission(
            [
              Permission.AUTO_APPROVE,
              Permission.AUTO_APPROVE_MUSIC,
              Permission.MANAGE_REQUESTS,
            ],
            { type: 'or' }
          ) && (
            <Alert
              title={intl.formatMessage(messages.pendingapproval)}
              type="warning"
            />
          )}
          {userQuotaMusic && (
            <QuotaDisplay
              quota={userQuotaMusic}
              mediaType="music"
              userOverride={requestOverrides?.user?.id}
            />
          )}
        </>
      )}
      {hasPermission(Permission.MANAGE_REQUESTS) && (
        <AdvancedRequester
          type="music"
          is4k={false}
          onChange={(overrides) => {
            setRequestOverrides(overrides);
          }}
          defaultOverrides={
            editRequest
              ? {
                  folder: editRequest.rootFolder,
                  profile: editRequest.profileId,
                  server: editRequest.serverId,
                  tags: editRequest.tags,
                }
              : undefined
          }
          requestUser={editRequest?.requestedBy}
        />
      )}
    </Modal>
  );
};

export default MusicRequestModal;
