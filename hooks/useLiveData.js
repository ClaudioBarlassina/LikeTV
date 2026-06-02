import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchLiveMatches, fetchMatchStats, MOCK_LIVE_MATCHES, MOCK_STATS } from '../services/api';

export default function useLiveData({ fixtureId, pollInterval = 10000 } = {}) {
  const [match, setMatch] = useState(MOCK_LIVE_MATCHES[0]);
  const [stats, setStats] = useState(MOCK_STATS);
  const [isLive, setIsLive] = useState(true);
  const intervalRef = useRef(null);

  const poll = useCallback(async () => {
    const matches = await fetchLiveMatches();
    if (matches?.length) setMatch(matches[0]);

    if (fixtureId) {
      const s = await fetchMatchStats(fixtureId);
      if (s) setStats(s);
    }
  }, [fixtureId]);

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, pollInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll, pollInterval]);

  return { match, stats, isLive };
}
