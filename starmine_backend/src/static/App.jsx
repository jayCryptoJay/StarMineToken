import React, { useEffect, useMemo, useState } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Progress } from './components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import './App.css';

const tg = window.Telegram?.WebApp || {
  initDataUnsafe: {
    user: {
      id: '123456789',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User'
    }
  },
  ready: () => console.log('Telegram WebApp ready'),
  expand: () => console.log('Expand WebApp'),
  HapticFeedback: { impactOccurred: () => {} },
  showAlert: (msg) => window.alert(msg)
};

const baseQuests = [
  { id: 'mine', label: 'Mine 300 Stardust', target: 300, reward: 150 },
  { id: 'tap', label: 'Score 60 in Stellar Tap', target: 60, reward: 120 },
  { id: 'upgrade', label: 'Buy 1 Upgrade', target: 1, reward: 90 }
];

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
    .toString()
    .padStart(2, '0')}`;
};

function App() {
  const [user] = useState({
    id: tg.initDataUnsafe?.user?.id || '123456789',
    username: tg.initDataUnsafe?.user?.username || 'testuser',
    first_name: tg.initDataUnsafe?.user?.first_name || 'Test',
    level: 1
  });

  const [activeTab, setActiveTab] = useState('mine');
  const [stardust, setStardust] = useState(250);
  const [crystals, setCrystals] = useState(5);
  const [miningStatus, setMiningStatus] = useState('idle');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [miningRate, setMiningRate] = useState(20);
  const [sessionYield, setSessionYield] = useState(0);
  const [streak, setStreak] = useState(1);
  const [eventMessage, setEventMessage] = useState('Solar winds are calm. Mining boost +0%.');
  const [eventsSeen, setEventsSeen] = useState(0);
  const [quests, setQuests] = useState(baseQuests.map((q) => ({ ...q, progress: 0, done: false })));
  const [activity, setActivity] = useState(['Welcome aboard, Captain.']);

  const [drillLevel, setDrillLevel] = useState(1);
  const [energyLevel, setEnergyLevel] = useState(1);

  const [gameLive, setGameLive] = useState(false);
  const [gameTimer, setGameTimer] = useState(20);
  const [tapScore, setTapScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const miningDuration = useMemo(() => 180 + (energyLevel - 1) * 60, [energyLevel]);

  useEffect(() => {
    tg.ready();
    tg.expand();
  }, []);

  useEffect(() => {
    const loop = setInterval(() => {
      if (miningStatus === 'active') {
        const earnedThisTick = miningRate / 3600;
        setSessionYield((prev) => prev + earnedThisTick);
        setTimeRemaining((prev) => Math.max(prev - 1, 0));
      } else if (miningStatus === 'cooldown') {
        setTimeRemaining((prev) => Math.max(prev - 1, 0));
      }
    }, 1000);

    return () => clearInterval(loop);
  }, [miningStatus, miningRate]);

  useEffect(() => {
    if (miningStatus === 'active' && timeRemaining === 0) {
      completeMining(false);
    }
    if (miningStatus === 'cooldown' && timeRemaining === 0) {
      setMiningStatus('idle');
      pushActivity('Cooldown finished. Rig is ready again.');
    }
  }, [timeRemaining, miningStatus]);

  useEffect(() => {
    if (!gameLive) return;
    const timer = setInterval(() => {
      setGameTimer((prev) => {
        if (prev <= 1) {
          finishMiniGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameLive]);

  useEffect(() => {
    const cosmicEventInterval = setInterval(() => {
      const rolls = [
        { text: 'Meteor shower! +15% mining for 60s.', multiplier: 1.15 },
        { text: 'Nebula fog... -10% mining for 60s.', multiplier: 0.9 },
        { text: 'Star alignment! +25% mining for 45s.', multiplier: 1.25 }
      ];
      const picked = rolls[Math.floor(Math.random() * rolls.length)];
      setMiningRate((r) => Number((r * picked.multiplier).toFixed(2)));
      setEventMessage(picked.text);
      setEventsSeen((v) => v + 1);
      pushActivity(`Cosmic event: ${picked.text}`);
    }, 45000);

    return () => clearInterval(cosmicEventInterval);
  }, []);

  const pushActivity = (line) => {
    setActivity((prev) => [line, ...prev].slice(0, 6));
  };

  const updateQuest = (questId, amount) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== questId || q.done) return q;
        const next = Math.min(q.target, q.progress + amount);
        const done = next >= q.target;
        if (done) {
          setStardust((s) => s + q.reward);
          pushActivity(`Quest complete: ${q.label} (+${q.reward} Stardust)`);
          tg.HapticFeedback?.impactOccurred('medium');
        }
        return { ...q, progress: next, done };
      })
    );
  };

  const startMining = () => {
    if (miningStatus !== 'idle') return;
    setMiningStatus('active');
    setTimeRemaining(miningDuration);
    setSessionYield(0);
    pushActivity('Mining session launched. Good luck, Captain.');
  };

  const completeMining = (early) => {
    const reward = Number((sessionYield * (early ? 0.75 : 1)).toFixed(2));
    setStardust((prev) => prev + reward);
    setMiningStatus('cooldown');
    setTimeRemaining(60);
    setSessionYield(0);
    updateQuest('mine', Math.round(reward));
    pushActivity(`Collected ${reward} Stardust${early ? ' (early extraction penalty)' : ''}.`);
    tg.HapticFeedback?.impactOccurred('light');
  };

  const buyUpgrade = (type) => {
    if (type === 'drill') {
      const cost = 120 + drillLevel * 75;
      if (stardust < cost) return;
      setStardust((s) => s - cost);
      setDrillLevel((lvl) => lvl + 1);
      setMiningRate((r) => Number((r + 6).toFixed(2)));
      updateQuest('upgrade', 1);
      pushActivity(`Drill upgraded to Lv.${drillLevel + 1}. Rate boosted.`);
      return;
    }

    const cost = 90 + energyLevel * 60;
    if (stardust < cost) return;
    setStardust((s) => s - cost);
    setEnergyLevel((lvl) => lvl + 1);
    updateQuest('upgrade', 1);
    pushActivity(`Energy cell upgraded to Lv.${energyLevel + 1}. Session length increased.`);
  };

  const buyPowerup = (kind) => {
    if (kind === 'burst' && stardust >= 180) {
      setStardust((s) => s - 180);
      setMiningRate((r) => Number((r * 1.25).toFixed(2)));
      pushActivity('Bought Stardust Magnet: +25% rate.');
    }

    if (kind === 'cooldown' && crystals >= 2 && miningStatus === 'cooldown') {
      setCrystals((c) => c - 2);
      setMiningStatus('idle');
      setTimeRemaining(0);
      pushActivity('Cooldown Nullifier used. Rig instantly ready.');
    }
  };

  const startMiniGame = () => {
    setGameLive(true);
    setGameTimer(20);
    setTapScore(0);
    setCombo(0);
    pushActivity('Stellar Tap started. Tap fast!');
  };

  const tapStar = () => {
    if (!gameLive) return;
    const gain = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
    setTapScore((s) => s + gain);
    setCombo((c) => c + 1);
    tg.HapticFeedback?.impactOccurred('soft');
  };

  const finishMiniGame = () => {
    setGameLive(false);
    const reward = Math.round(tapScore * 2.5);
    setStardust((s) => s + reward);
    setBestScore((best) => Math.max(best, tapScore));
    updateQuest('tap', tapScore);
    pushActivity(`Stellar Tap finished: score ${tapScore}, +${reward} Stardust.`);
  };

  const achievements = [
    { name: 'Cadet Miner', unlocked: stardust >= 500 },
    { name: 'Tap Ace', unlocked: bestScore >= 80 },
    { name: 'Upgrade Junkie', unlocked: drillLevel + energyLevel >= 6 },
    { name: 'Cosmic Survivor', unlocked: eventsSeen >= 3 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-blue-950 text-white pb-20">
      <header className="p-4 border-b border-cyan-900/40 bg-gray-900/60 sticky top-0 z-10 backdrop-blur">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-cyan-300">🚀 StarMine Command Deck</h1>
          <div className="text-right text-xs">
            <p className="text-gray-400">Pilot</p>
            <p className="font-semibold">{user.first_name}</p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        <Card className="mb-4 bg-black/25 border-cyan-900/50">
          <CardContent className="grid grid-cols-3 gap-3 p-4 text-center">
            <div>
              <p className="text-xs text-gray-400">Stardust</p>
              <p className="text-lg font-bold text-cyan-300">{stardust.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Crystals</p>
              <p className="text-lg font-bold text-purple-300">{crystals}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Streak</p>
              <p className="text-lg font-bold text-orange-300">{streak} 🔥</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4 bg-blue-950/30 border-blue-800/70">
          <CardContent className="p-4">
            <p className="text-sm text-blue-200">{eventMessage}</p>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="mine">Mine</TabsTrigger>
            <TabsTrigger value="upgrade">Upgrade</TabsTrigger>
            <TabsTrigger value="play">Play</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="space-y-4">
            <Card className="bg-gray-900/50 border-cyan-900/50">
              <CardHeader>
                <CardTitle className="text-cyan-300">Mining Core</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-28 rounded-lg mb-4 starfield flex items-center justify-center">
                  <div className={`drill-orb ${miningStatus === 'active' ? 'animate-pulse' : ''}`} />
                </div>
                <div className="space-y-2 text-sm">
                  <p>Status: <span className="font-bold">{miningStatus}</span></p>
                  <p>Time: <span className="font-bold">{formatTime(timeRemaining)}</span></p>
                  <p>Rate: <span className="font-bold text-cyan-300">{miningRate.toFixed(2)}/hr</span></p>
                  <p>Session Yield: <span className="font-bold text-cyan-300">{sessionYield.toFixed(2)}</span></p>
                  <Progress value={miningStatus === 'active' ? ((miningDuration - timeRemaining) / miningDuration) * 100 : 0} className="h-2 bg-gray-800" />
                </div>

                {miningStatus === 'idle' && (
                  <Button className="mt-4 w-full bg-gradient-to-r from-cyan-500 to-blue-600" onClick={startMining}>Start Mining</Button>
                )}
                {miningStatus === 'active' && (
                  <Button variant="outline" className="mt-4 w-full border-cyan-500 text-cyan-300" onClick={() => completeMining(true)}>
                    Collect Early (-25%)
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upgrade" className="space-y-4">
            <Card className="bg-gray-900/50 border-cyan-900/50">
              <CardHeader><CardTitle className="text-cyan-300">Upgrades & Power-ups</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="panel-row">
                  <div>
                    <p className="font-semibold">Drill Lv.{drillLevel}</p>
                    <p className="text-xs text-gray-400">+6 rate each level</p>
                  </div>
                  <Button size="sm" onClick={() => buyUpgrade('drill')}>Upgrade</Button>
                </div>
                <div className="panel-row">
                  <div>
                    <p className="font-semibold">Energy Lv.{energyLevel}</p>
                    <p className="text-xs text-gray-400">+60s session length</p>
                  </div>
                  <Button size="sm" onClick={() => buyUpgrade('energy')}>Upgrade</Button>
                </div>
                <div className="panel-row">
                  <div>
                    <p className="font-semibold">Stardust Magnet</p>
                    <p className="text-xs text-gray-400">+25% mining rate</p>
                  </div>
                  <Button size="sm" onClick={() => buyPowerup('burst')}>180 Dust</Button>
                </div>
                <div className="panel-row">
                  <div>
                    <p className="font-semibold">Cooldown Nullifier</p>
                    <p className="text-xs text-gray-400">Instantly clear cooldown</p>
                  </div>
                  <Button size="sm" onClick={() => buyPowerup('cooldown')}>2 💎</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="play" className="space-y-4">
            <Card className="bg-gray-900/50 border-cyan-900/50">
              <CardHeader><CardTitle className="text-cyan-300">Stellar Tap Challenge</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-300">20-second reflex game. Build combo for bonus points.</p>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="badge-box">Time: {gameTimer}s</div>
                  <div className="badge-box">Score: {tapScore}</div>
                  <div className="badge-box">Combo: {combo}</div>
                </div>
                {!gameLive ? (
                  <Button className="w-full" onClick={startMiniGame}>Start Round</Button>
                ) : (
                  <Button className="w-full tap-button" onClick={tapStar}>✨ TAP STAR ✨</Button>
                )}
                <p className="text-xs text-gray-400">Best score: {bestScore}</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-cyan-900/50">
              <CardHeader><CardTitle className="text-cyan-300">Achievements</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {achievements.map((a) => (
                  <div key={a.name} className={`achievement ${a.unlocked ? 'on' : 'off'}`}>
                    {a.unlocked ? '🏆' : '🔒'} {a.name}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <Card className="bg-gray-900/50 border-cyan-900/50">
              <CardHeader><CardTitle className="text-cyan-300">Daily Quests</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {quests.map((q) => (
                  <div key={q.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{q.label}</span>
                      <span>{q.progress}/{q.target}</span>
                    </div>
                    <Progress value={(q.progress / q.target) * 100} className="h-2 bg-gray-800" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-cyan-900/50">
              <CardHeader><CardTitle className="text-cyan-300">Crew Feed</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {activity.map((line) => (
                  <div key={line} className="bg-gray-950/60 p-2 rounded">{line}</div>
                ))}
              </CardContent>
            </Card>

            <Button
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
              onClick={() => {
                navigator.clipboard?.writeText('https://t.me/starmine_bot?start=STAR123');
                tg.showAlert?.('Referral link copied!');
                setStreak((s) => s + 1);
              }}
            >
              Share Referral Link
            </Button>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
