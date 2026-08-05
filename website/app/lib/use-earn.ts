import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  createApiKey,
  getMyStats,
  getNetworkStats,
  requestPayout,
  requestWorkerToken,
  revokeApiKey,
  runTestJob,
  setPayoutAddress,
  type IssuedApiKey,
  type NetworkStats,
  type UserStats,
  type WorkerClass,
} from "./orchestrator";

const POLL_MS = 5000;

/** Signed-in earnings dashboard: user stats + public network stats + actions. */
export function useEarn() {
  const { authenticated, getAccessToken } = usePrivy();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [network, setNetwork] = useState<NetworkStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    if (!authenticated) {
      setStats(null);
      return;
    }
    try {
      const token = await getAccessToken();
      if (!token) return;
      setStats(await getMyStats(token));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
    }
  }, [authenticated, getAccessToken]);

  const refreshNetwork = useCallback(async () => {
    try {
      setNetwork(await getNetworkStats());
    } catch {
      /* network panel is best-effort */
    }
  }, []);

  useEffect(() => {
    void refreshNetwork();
    const id = setInterval(() => void refreshNetwork(), POLL_MS);
    return () => clearInterval(id);
  }, [refreshNetwork]);

  useEffect(() => {
    void refreshStats();
    const id = setInterval(() => void refreshStats(), POLL_MS);
    return () => clearInterval(id);
  }, [refreshStats]);

  const getToken = useCallback(
    async (workerClass: WorkerClass): Promise<string> => {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in first");
      const res = await requestWorkerToken(token, workerClass);
      void refreshStats();
      return res.token;
    },
    [getAccessToken, refreshStats],
  );

  const testJob = useCallback(
    async (
      prompt: string,
      handlers: Parameters<typeof runTestJob>[2],
    ): Promise<void> => {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in first");
      await runTestJob(token, prompt, handlers);
      void refreshStats();
    },
    [getAccessToken, refreshStats],
  );

  const savePayoutAddress = useCallback(
    async (address: string, chainId?: number): Promise<void> => {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in first");
      await setPayoutAddress(token, address, chainId);
      await refreshStats();
    },
    [getAccessToken, refreshStats],
  );

  const withdraw = useCallback(async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Sign in first");
    await requestPayout(token);
    await refreshStats();
  }, [getAccessToken, refreshStats]);

  const newApiKey = useCallback(
    async (label?: string): Promise<IssuedApiKey> => {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in first");
      const issued = await createApiKey(token, label);
      await refreshStats();
      return issued;
    },
    [getAccessToken, refreshStats],
  );

  const removeApiKey = useCallback(
    async (id: string): Promise<void> => {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in first");
      await revokeApiKey(token, id);
      await refreshStats();
    },
    [getAccessToken, refreshStats],
  );

  return {
    stats,
    network,
    error,
    refreshStats,
    getToken,
    testJob,
    savePayoutAddress,
    withdraw,
    newApiKey,
    removeApiKey,
  };
}
