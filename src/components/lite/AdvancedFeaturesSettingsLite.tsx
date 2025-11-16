import React from 'react';
import { UnifiedAdvancedFeaturesSettings } from '../UnifiedAdvancedFeaturesSettings';

interface Profile {
  name?: string;
  email?: string;
  id?: string;
}

interface AdvancedFeaturesSettingsLiteProps {
  userId: string;
  profile: Profile | null;
}

export const AdvancedFeaturesSettingsLite = ({ userId, profile }: AdvancedFeaturesSettingsLiteProps) => {
  return <UnifiedAdvancedFeaturesSettings userId={userId} profile={profile} isLite={true} />;
};