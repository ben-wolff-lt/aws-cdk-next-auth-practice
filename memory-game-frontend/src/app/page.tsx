'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';

const TOTAL_LIVES = 5;
const PREGAME_DELAY = 5000;

// Hook to fetch photos
const usePhotos = () => {
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await axios.get(
          'https://dog.ceo/api/breeds/image/random/18'
        );
        const photos: string[] = (response.data as { message: string[] })
          .message;
        setPhotos(photos);
      } catch (error) {
        console.error('Error fetching photos:', error);
      }
    };

    fetchPhotos();
  }, []);

  return photos;
};
export default function Home() {
  const photos = usePhotos();
  const [isSubmitFormVisible, setIsSubmitFormVisible] = useState(true);
  const [cards, setCards] = useState<
    { url: string; uniqueId: number; matched: boolean; flipped: boolean }[]
  >([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [moves, setMoves] = useState(0);
  const [lives, setLives] = useState(TOTAL_LIVES);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>(
    'playing'
  );
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<
    { userId: string; score: number; timeTaken: number }[]
  >([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Function to fetch leaderboard data
  const fetchLeaderboard = async () => {
    const backendAPI =
      'https://npcrx97m7k.execute-api.us-east-1.amazonaws.com/prod/leaderboard';

    try {
      const response = await axios.get(backendAPI, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const leaderboardData = response.data.map((entry: any) => ({
        ...entry,
        userId: entry.PK.split('#')[1] // Parse user name from PK
      }));
      leaderboardData.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score; // Higher score first
        }
        return a.timeTaken - b.timeTaken; // Lower time first when scores are tied
      });
      setLeaderboard(leaderboardData);
      setShowLeaderboard(true);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      alert('Failed to fetch the leaderboard. Please try again.');
    }
  };

  // Restart the game
  const restartGame = () => {
    if (photos.length > 0) {
      const duplicatedPhotos = [...photos, ...photos].map((url, index) => ({
        url,
        uniqueId: index,
        matched: false,
        flipped: true
      }));
      const shuffledPhotos = duplicatedPhotos.sort(() => Math.random() - 0.5);
      setCards(shuffledPhotos);

      setFlippedCards([]);
      setMoves(0);
      setLives(TOTAL_LIVES);
      setGameStatus('playing');
      setStartTime(null);
      setEndTime(null);
      setIsSubmitFormVisible(true);
      setShowLeaderboard(false);

      setTimeout(() => {
        const hiddenPhotos = shuffledPhotos.map((card) => ({
          ...card,
          flipped: false
        }));
        setCards(hiddenPhotos);
        setStartTime(new Date());
      }, PREGAME_DELAY);
    }
  };

  // Calculate elapsed time
  const calculateElapsedTime = () => {
    if (startTime && endTime) {
      const elapsedMilliseconds = endTime.getTime() - startTime.getTime();
      return (elapsedMilliseconds / 1000).toFixed(2);
    }
    return '0.00';
  };

  // Handle form submission
  const submitScore = async () => {
    const backendAPI =
      'https://npcrx97m7k.execute-api.us-east-1.amazonaws.com/prod/game-result';

    try {
      const payload = {
        userId: playerName,
        gameId: new Date().toISOString(),
        score: moves - TOTAL_LIVES,
        timeTaken: parseFloat(calculateElapsedTime()),
        gameDate: new Date().toISOString()
      };

      await axios.post(backendAPI, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      alert('Score submitted successfully!');
      setIsSubmitFormVisible(false);
    } catch (error) {
      console.error('Error submitting score:', error);
      alert('Failed to submit the score. Please try again.');
    }
  };

  // Handle card flip logic (unchanged)

  useEffect(() => {
    restartGame();
  }, [photos]);

  useEffect(() => {
    if (showLeaderboard) {
      const canvas = document.getElementById(
        'confettiCanvas'
      ) as HTMLCanvasElement;
      const myConfetti = confetti.create(canvas, {
        resize: true,
        useWorker: true
      });

      // Burst confetti on leaderboard display
      myConfetti({
        particleCount: 300,
        spread: 120,
        origin: { y: 0.6 }
      });

      return () => {
        myConfetti.reset(); // Cleanup when leaderboard is closed
      };
    }
  }, [showLeaderboard]);

  // Handle card flip logic
  const handleFlip = (index: number) => {
    if (
      disabled ||
      cards[index].matched ||
      flippedCards.includes(index) ||
      gameStatus !== 'playing'
    )
      return;

    const updatedCards = [...cards];
    updatedCards[index].flipped = true;
    setCards(updatedCards);

    setFlippedCards((prev) => [...prev, index]);

    if (flippedCards.length === 1) {
      const firstIndex = flippedCards[0];
      const secondIndex = index;

      setMoves((prev) => prev + 1);
      setDisabled(true);

      if (cards[firstIndex].url === cards[secondIndex].url) {
        updatedCards[firstIndex].matched = true;
        updatedCards[secondIndex].matched = true;

        if (updatedCards.every((card) => card.matched)) {
          setGameStatus('won');
          setEndTime(new Date()); // Set end time
        }

        setTimeout(() => {
          setFlippedCards([]);
          setDisabled(false);
        }, 1000);
      } else {
        setTimeout(() => {
          updatedCards[firstIndex].flipped = false;
          updatedCards[secondIndex].flipped = false;
          setCards([...updatedCards]);
          setFlippedCards([]);
          setDisabled(false);

          setLives((prev) => {
            const updatedLives = prev - 1;

            if (updatedLives <= 0) {
              setGameStatus('lost');
              setEndTime(new Date()); // Set end time
            }

            return updatedLives;
          });
        }, 1000);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 text-white">
      {!showLeaderboard && (
        <div>
          {gameStatus === 'playing' && (
            <div className="flex flex-row items-center gap-10 mb-2 justify-center">
              <h1 className="text-4xl font-bold">Doggo Memory Game</h1>
              <p className="text-2xl">Lives: {lives}</p>
            </div>
          )}

          {(gameStatus === 'won' || gameStatus === 'lost') && (
            <div className="text-center">
              <p
                className={`text-4xl font-bold ${
                  gameStatus === 'won' ? 'text-green-500' : 'text-blue-500'
                } mb-4`}
              >
                {gameStatus === 'won' ? 'You Win!' : 'Good Game!'}
              </p>
              <div className="mb-4">
                <p className="text-2xl mb-2">
                  Pairs Found: <b>{moves - TOTAL_LIVES}</b>
                </p>
                <p className="text-2xl mb-2">
                  Final Time: <b>{calculateElapsedTime()}s</b>
                </p>
              </div>
              {isSubmitFormVisible ? (
                <div className="flex flex-row items-center justify-center gap-4">
                  <input
                    type="text"
                    placeholder="Enter your name"
                    className="px-4 py-2 text-black rounded-lg"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
                    onClick={submitScore}
                    disabled={!playerName.trim()}
                  >
                    Submit Score
                  </button>
                  <button
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg"
                    onClick={fetchLeaderboard}
                  >
                    Show Leaderboard
                  </button>
                  <button
                    className="px-4 py-2 bg-green-500 text-white rounded-lg"
                    onClick={restartGame}
                  >
                    Play Again
                  </button>
                </div>
              ) : (
                <div className="flex flex-row items-center justify-center gap-4">
                  <button
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg"
                    onClick={fetchLeaderboard}
                  >
                    Show Leaderboard
                  </button>
                  <button
                    className="px-4 py-2 bg-green-500 text-white rounded-lg"
                    onClick={restartGame}
                  >
                    Play Again
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 mt-8">
            {cards.map((card, index) => (
              <div
                key={card.uniqueId}
                className={`relative h-24 w-24 sm:h-32 sm:w-32 rounded-md overflow-hidden cursor-pointer ${
                  card.flipped || card.matched ? 'bg-white' : 'bg-gray-500'
                }`}
                onClick={() => handleFlip(index)}
              >
                {card.flipped || card.matched ? (
                  <Image
                    src={card.url}
                    alt={`Dog photo ${card.uniqueId}`}
                    fill
                    sizes="100%"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-3xl">
                    ?
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showLeaderboard && (
        <div className="flex flex-col items-center w-full max-w-4xl bg-gray-800 p-8 rounded-lg shadow-lg animate-fade-in">
          <h2 className="text-5xl font-bold mb-6 text-white">Leaderboard</h2>
          <ul className="w-full text-xl text-white space-y-4">
            {leaderboard.map((entry, index) => (
              <li
                key={index}
                className="grid grid-cols-4 items-center bg-gray-700 px-6 py-4 rounded-lg"
              >
                <span className="font-bold text-yellow-400 text-left">
                  #{index + 1}
                </span>
                <span className="text-gray-300 text-left">{entry.userId}</span>
                <span className="text-green-400 text-center">
                  <b>{entry.score}</b> Pairs Found
                </span>
                <span className="text-blue-300 text-right">
                  {entry.timeTaken}s
                </span>
              </li>
            ))}
          </ul>
          <button
            className="mt-8 px-6 py-3 bg-blue-500 text-white text-lg font-semibold rounded-lg hover:bg-blue-600 transition-all duration-300"
            onClick={() => setShowLeaderboard(false)}
          >
            Back to Game
          </button>
        </div>
      )}
    </div>
  );
}
