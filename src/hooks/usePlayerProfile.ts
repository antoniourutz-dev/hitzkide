import { useEffect, useState } from 'react';
import { playerService } from '../services/playerService';

export function usePlayerProfile() {
  const [profile, setProfile] = useState(() => playerService.getProfile());

  useEffect(() => {
    setProfile(playerService.getProfile());

    return playerService.subscribeToProfileChanges(() => {
      setProfile(playerService.getProfile());
    });
  }, []);

  return profile;
}
