import { environment, type SettingsJsonFile, type Machine } from "../core/globals";
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
      machines: Array.isArray(parsed.machines) ? parsed.machines : []
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
        machines: []
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
