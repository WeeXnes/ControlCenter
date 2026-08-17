import { environment, type SettingsJsonFile } from "../core/globals";
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

export function loadJsonFile() {
  try {
    createEmptySettingsIfNotExists();
    const jsonStr = fs.readFileSync(environment.files.settings, 'utf-8');
    const parsed = JSON.parse(jsonStr) as SettingsJsonFile;
    
    environment.settings = {
      password_hash: parsed.password_hash || '',
      jwt_secret: parsed.jwt_secret || randomBytes(32).toString('hex'),
      onboarded: parsed.onboarded ?? false,
      default_ssh_key: parsed.default_ssh_key || '',
      machines: Array.isArray(parsed.machines) ? parsed.machines : [],
      infrastructure: {
        devices: Array.isArray(parsed.infrastructure?.devices) ? parsed.infrastructure.devices : [],
        nodeServices: parsed.infrastructure?.nodeServices && typeof parsed.infrastructure.nodeServices === 'object' ? parsed.infrastructure.nodeServices : {},
        customLinks: Array.isArray(parsed.infrastructure?.customLinks) ? parsed.infrastructure.customLinks : [],
        nodePositions: parsed.infrastructure?.nodePositions && typeof parsed.infrastructure.nodePositions === 'object' ? parsed.infrastructure.nodePositions : {},
        disabledNodes: Array.isArray(parsed.infrastructure?.disabledNodes) ? parsed.infrastructure.disabledNodes : []
      }
    };

    if (!parsed.jwt_secret) {
      saveJsonFile();
    }
  } catch (error) {
    console.error('[SETTINGS] Error reading settings file:', error);
  }
}

export function saveJsonFile() {
  try {
    createPathIfNotExists(environment.paths.data);
    const jsonSettings = JSON.stringify(environment.settings, null, 2);
    fs.writeFileSync(environment.files.settings, jsonSettings, 'utf-8');
  } catch (error) {
    console.error('[SETTINGS] Error writing settings file:', error);
  }
}

function createEmptySettingsIfNotExists() {
  try {
    createPathIfNotExists(environment.paths.data);
    if (!fs.existsSync(environment.files.settings)) {
      const emptySettings: SettingsJsonFile = {
        password_hash: '',
        jwt_secret: randomBytes(32).toString('hex'),
        onboarded: false,
        default_ssh_key: '',
        machines: [],
        infrastructure: {
          devices: [],
          nodeServices: {},
          customLinks: [],
          nodePositions: {},
          disabledNodes: []
        }
      };
      fs.writeFileSync(environment.files.settings, JSON.stringify(emptySettings, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('[SETTINGS] Error creating empty settings:', error);
  }
}

function createPathIfNotExists(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.error('[SETTINGS] Error creating directory:', err);
  }
}
