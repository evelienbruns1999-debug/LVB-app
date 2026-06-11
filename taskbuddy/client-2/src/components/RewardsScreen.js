import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { NL } from '../nl';
import GrowingTree from './GrowingTree';

export default function RewardsScreen({ client }) {
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState([]);

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

  const activeRewards = rewards.filter((reward) => reward.active);
  const earnedRewards = activeRewards.filter((reward) => points >= reward.points_needed);
  const lockedRewards = activeRewards.filter((reward) => points < reward.points_needed);

  return (
    <div style={{ padding: '18px 16px 110px' }}>
      <div className="card" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
        <GrowingTree steps={Math.min(18, Math.floor(points / 2))} earnedRewards={earnedRewards} compact={false} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            {NL.pointsTitle}
          </div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 36, color: 'var(--blue-dk)', lineHeight: 1 }}>{points}</div>
          {earnedRewards.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: 'var(--green-dk)' }}>
              🌟 {earnedRewards.length} beloning{earnedRewards.length === 1 ? '' : 'en'} behaald!
            </div>
          )}
        </div>
      </div>

      {earnedRewards.length > 0 && (
        <>
          <h3 style={{ marginBottom: 10, color: 'var(--green-dk)' }}>✨ Behaald</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {earnedRewards.map((reward) => (
              <div key={reward.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--green-lt)', border: '1.5px solid var(--green)' }}>
                <div style={{ fontSize: 32 }}>🎁</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{reward.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--green-dk)', fontWeight: 700 }}>
                    {reward.points_needed} {NL.pointsLabel}
                  </div>
                </div>
                <div className="reward-earned-badge">⭐ {NL.rewardEarned}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {lockedRewards.length > 0 && (
        <>
          <h3 style={{ marginBottom: 10 }}>Nog te halen</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lockedRewards.map((reward) => {
              const pct = Math.min(100, Math.round((points / reward.points_needed) * 100));
              const remaining = reward.points_needed - points;
              return (
                <div key={reward.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 28, opacity: 0.6 }}>🎁</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{reward.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 700 }}>
                      Nog {remaining} {NL.pointsLabel}
                    </div>
                    <div className="reward-progress-track">
                      <div className="reward-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeRewards.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-mid)', fontWeight: 600 }}>
          {NL.noRewards}
        </div>
      )}
    </div>
  );
}
