import Head from 'next/head';
import { useGame } from '../context/GameContext';
import Header from '../components/Header';
import Settings from '../components/Settings';
import Phase1 from '../components/Phase1';
import Phase2 from '../components/Phase2';
import Phase3 from '../components/Phase3';

export default function Home() {
  const { state } = useGame();
  const { view, currentPhase } = state;

  return (
    <>
      <Head>
        <title>What&apos;s In the Box?</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📦</text></svg>" />
      </Head>

      <div className="app">
        <Header />

        <main className="main-content">
          {view === 'settings' ? (
            <Settings />
          ) : (
            <div className="game-view">
              {currentPhase === 1 && <Phase1 />}
              {currentPhase === 2 && <Phase2 />}
              {currentPhase === 3 && <Phase3 />}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
