import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { NL } from '../nl';

export default function RewardsScreen({ client, onRedeem }) {
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    loadRewards();
  }, [client.id]);

  async function loadRewards() {
    try {
      const res = await api.getRewards(client.id);
      setPoints(res.points || 0);
      setRewards(res.rewards || []);
    } catch (_) {}
  }

  async function redeem(reward) {
    setBusy(reward.id);
    try {
      const res = await api.redeemReward(reward.id, { client_id: client.id });
      setPoints(res.total_points || 0);
      onRedeem?.();
    } catch (_) {}
    setBusy(null);
  }

  return (
    <div style={{ padding: '18px 16px 110px' }}>
      <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            {NL.pointsTitle}
          </div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, color: 'var(--blue-dk)' }}>{points}</div>
        </div>
        <div style={{ fontSize: 40 }}>🏆</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rewards.filter((reward) => reward.active).map((reward) => {
          const canRedeem = points >= reward.points_needed;
          return (
            <div key={reward.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 28 }}>🎁</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{reward.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 700 }}>
                  {reward.points_needed} {NL.pointsLabel}
                </div>
              </div>
              <button
                type="button"
                className={`btn btn-sm ${canRedeem ? 'btn-green' : 'btn-ghost'}`}
                onClick={() => redeem(reward)}
                disabled={!canRedeem || busy === reward.id}
              >
                {NL.redeem}
              </button>
            </div>
          );
        })}
        {rewards.filter((reward) => reward.active).length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-mid)', fontWeight: 600 }}>
            {NL.noRewards}
          </div>
        )}
      </div>
    </div>
  );
}
