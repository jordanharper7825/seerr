import { Router } from 'express';
import { getSettings } from '@server/lib/settings';
import LidarrAPI from '@server/api/servarr/lidarr';
import ServarrBase from '@server/api/servarr/base';
import { isAuthenticated } from '@server/middleware/auth';
import { Permission } from '@server/lib/permissions';
import logger from '@server/logger';

const lidarrRoutes = Router();

/**
 * GET /api/v1/settings/lidarr
 * Get all Lidarr instances
 */
lidarrRoutes.get(
  '/',
  isAuthenticated(Permission.ADMIN),
  async (req, res) => {
    const settings = getSettings();
    return res.status(200).json(settings.lidarr || []);
  }
);

/**
 * POST /api/v1/settings/lidarr
 * Add/Update Lidarr instance
 */
lidarrRoutes.post(
  '/',
  isAuthenticated(Permission.MANAGE_SETTINGS),
  async (req, res, next) => {
    try {
      const settings = getSettings();
      const { id } = req.body;

      if (!settings.lidarr) {
        settings.lidarr = [];
      }

      // If ID exists, update; otherwise create
      if (id !== undefined) {
        const index = settings.lidarr.findIndex((s) => s.id === id);
        if (index === -1) {
          return res.status(404).json({ error: 'Lidarr instance not found' });
        }
        settings.lidarr[index] = { ...settings.lidarr[index], ...req.body };
      } else {
        const newId =
          settings.lidarr.length > 0
            ? Math.max(...settings.lidarr.map((s) => s.id)) + 1
            : 0;
        settings.lidarr.push({ id: newId, ...req.body });
      }

      await settings.save();
      return res.status(200).json(settings.lidarr);
    } catch (e) {
      logger.error('Failed to save Lidarr settings', {
        label: 'Lidarr Settings',
        errorMessage: e.message,
      });
      next({ status: 500, message: 'Failed to save Lidarr settings' });
    }
  }
);

/**
 * GET /api/v1/settings/lidarr/:id/test
 * Test Lidarr connection
 */
lidarrRoutes.get(
  '/:id/test',
  isAuthenticated(Permission.MANAGE_SETTINGS),
  async (req, res, next) => {
    try {
      const settings = getSettings();
      const lidarrSettings = settings.lidarr?.find(
        (s) => s.id === Number(req.params.id)
      );

      if (!lidarrSettings) {
        return res.status(404).json({ error: 'Lidarr instance not found' });
      }

      const lidarr = new LidarrAPI({
        url: ServarrBase.buildUrl(lidarrSettings),
        apiKey: lidarrSettings.apiKey,
      });

      const status = await lidarr.getSystemStatus();

      return res.status(200).json({
        success: true,
        version: status.version,
      });
    } catch (e) {
      logger.error('Lidarr connection test failed', {
        label: 'Lidarr Settings',
        errorMessage: e.message,
      });
      next({ status: 500, message: 'Lidarr connection test failed' });
    }
  }
);

/**
 * GET /api/v1/settings/lidarr/:id/profiles
 * Get quality and metadata profiles
 */
lidarrRoutes.get(
  '/:id/profiles',
  isAuthenticated(Permission.MANAGE_SETTINGS),
  async (req, res, next) => {
    try {
      const settings = getSettings();
      const lidarrSettings = settings.lidarr?.find(
        (s) => s.id === Number(req.params.id)
      );

      if (!lidarrSettings) {
        return res.status(404).json({ error: 'Lidarr instance not found' });
      }

      const lidarr = new LidarrAPI({
        url: ServarrBase.buildUrl(lidarrSettings),
        apiKey: lidarrSettings.apiKey,
      });

      const [qualityProfiles, metadataProfiles] = await Promise.all([
        lidarr.getProfiles(),
        lidarr.getMetadataProfiles(),
      ]);

      return res.status(200).json({
        qualityProfiles,
        metadataProfiles,
      });
    } catch (e) {
      logger.error('Failed to retrieve Lidarr profiles', {
        label: 'Lidarr Settings',
        errorMessage: e.message,
      });
      next({ status: 500, message: 'Failed to retrieve Lidarr profiles' });
    }
  }
);

/**
 * GET /api/v1/settings/lidarr/:id/rootfolders
 * Get root folders
 */
lidarrRoutes.get(
  '/:id/rootfolders',
  isAuthenticated(Permission.MANAGE_SETTINGS),
  async (req, res, next) => {
    try {
      const settings = getSettings();
      const lidarrSettings = settings.lidarr?.find(
        (s) => s.id === Number(req.params.id)
      );

      if (!lidarrSettings) {
        return res.status(404).json({ error: 'Lidarr instance not found' });
      }

      const lidarr = new LidarrAPI({
        url: ServarrBase.buildUrl(lidarrSettings),
        apiKey: lidarrSettings.apiKey,
      });

      const rootFolders = await lidarr.getRootFolders();

      return res.status(200).json(rootFolders);
    } catch (e) {
      logger.error('Failed to retrieve root folders', {
        label: 'Lidarr Settings',
        errorMessage: e.message,
      });
      next({ status: 500, message: 'Failed to retrieve root folders' });
    }
  }
);

/**
 * DELETE /api/v1/settings/lidarr/:id
 * Delete Lidarr instance
 */
lidarrRoutes.delete(
  '/:id',
  isAuthenticated(Permission.MANAGE_SETTINGS),
  async (req, res, next) => {
    try {
      const settings = getSettings();
      const index = settings.lidarr?.findIndex(
        (s) => s.id === Number(req.params.id)
      );

      if (index === undefined || index === -1) {
        return res.status(404).json({ error: 'Lidarr instance not found' });
      }

      settings.lidarr?.splice(index, 1);
      await settings.save();

      return res.status(200).json({ success: true });
    } catch (e) {
      logger.error('Failed to delete Lidarr instance', {
        label: 'Lidarr Settings',
        errorMessage: e.message,
      });
      next({ status: 500, message: 'Failed to delete Lidarr instance' });
    }
  }
);

export default lidarrRoutes;
