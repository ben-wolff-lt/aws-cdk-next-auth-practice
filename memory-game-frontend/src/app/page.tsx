'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import axios from 'axios';

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
  const [cards, setCards] = useState<
    { url: string; uniqueId: number; matched: boolean; flipped: boolean }[]
  >([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [moves, setMoves] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>(
    'playing'
  );
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [playerName, setPlayerName] = useState('');

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
      setLives(3);
      setGameStatus('playing');
      setStartTime(null);
      setEndTime(null);

      setTimeout(() => {
        const hiddenPhotos = shuffledPhotos.map((card) => ({
          ...card,
          flipped: false
        }));
        setCards(hiddenPhotos);
        setStartTime(new Date()); // Set start time
      }, 3000);
    }
  };

  // Calculate elapsed time
  const calculateElapsedTime = () => {
    if (startTime && endTime) {
      const elapsedMilliseconds = endTime.getTime() - startTime.getTime();
      return (elapsedMilliseconds / 1000).toFixed(2); // Convert to seconds
    }
    return '0.00';
  };

  // Handle form submission
  const submitScore = async () => {
    const backendAPI =
      'https://npcrx97m7k.execute-api.us-east-1.amazonaws.com/prod/game-result';

    try {
      const payload = {
        userId: playerName, // Assuming the player's name is used as userId
        gameId: new Date().toISOString(), // Generate a unique gameId based on current time
        score: moves, // Assuming score is based on moves
        timeTaken: parseFloat(calculateElapsedTime()), // Time in seconds
        gameDate: new Date().toISOString() // Current date as gameDate
      };

      await axios.post(backendAPI, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      alert('Score submitted successfully!');
    } catch (error) {
      console.error('Error submitting score:', error);
      alert('Failed to submit the score. Please try again.');
    }
  };

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

  useEffect(() => {
    restartGame();
  }, [photos]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 text-white">
      {gameStatus === 'playing' && (
        <div>
          <h1 className="text-4xl font-bold mb-4">Doggo Memory Game</h1>
          <p className="text-xl mb-4">Lives: {lives}</p>
          <p className="text-xl mb-4">Moves: {moves}</p>
        </div>
      )}

      {(gameStatus === 'won' || gameStatus === 'lost') && (
        <div className="text-center">
          <p
            className={`text-4xl font-bold ${
              gameStatus === 'won' ? 'text-green-500' : 'text-red-500'
            } mb-4`}
          >
            {gameStatus === 'won' ? 'You Win!' : 'Game Over'}
          </p>
          <div className="mb-4">
            <p className="text-2xl mb-2">
              Total Moves: <b>{moves}</b>
            </p>
            <p className="text-2xl mb-2">
              Total Time: <b>{calculateElapsedTime()}s</b>
            </p>
          </div>
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
              className="px-4 py-2 bg-green-500 text-white rounded-lg"
              onClick={restartGame}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 mt-8">
        {cards.map((card, index) => (
          <div
            key={card.uniqueId}
            className={`relative h-24 w-24 sm:h-32 sm:w-32 rounded-md overflow-hidden cursor-pointer ${
              card.flipped || card.matched ? 'bg-white' : 'bg-gray-400'
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
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
                ?
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
