'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export type Photo = {
  photoId: number;
  url: string;
  albumId: number;
  title: string;
  matched: boolean;
  flipped?: boolean;
  uniqueId?: number;
};

export type Album = {
  albumId: number;
  photos: Photo[];
};

const API_PATH = '/api/proxy';

const useAlbums = (): Album[] => {
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    const fetchAlbums = async () => {
      await fetch(`${API_PATH}/albums`, {
        // Correctly concatenated URL
        headers: {
          lt_api_key: 'lt_tech_showcase'
        }
      })
        .then((res) => res.json())
        .then((data) => setAlbums(data))
        .catch((e) => console.error('Error fetching albums:', e));
    };

    fetchAlbums();
  }, []);

  return albums.sort((album1, album2) => album1.albumId - album2.albumId);
};

export default function Home() {
  const albums = useAlbums();
  const [cards, setCards] = useState<Photo[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [moves, setMoves] = useState(0);

  // 1. Set up the game when albums are fetched
  useEffect(() => {
    if (albums.length > 0) {
      const photos = albums.flatMap((album) => album.photos.slice(0, 5)); // Limit to 5 photos per album
      const duplicatedPhotos = [...photos, ...photos].map((photo, index) => ({
        ...photo,
        uniqueId: index,
        matched: false
      }));
      const shuffledPhotos = duplicatedPhotos.sort(() => Math.random() - 0.5);
      setCards(shuffledPhotos);
    }
  }, [albums]);

  // 2. Handle card flip logic
  const handleFlip = (index: number) => {
    if (disabled || cards[index].matched || flippedCards.includes(index))
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

      if (cards[firstIndex].photoId === cards[secondIndex].photoId) {
        // Match found
        updatedCards[firstIndex].matched = true;
        updatedCards[secondIndex].matched = true;
        setTimeout(() => {
          setFlippedCards([]);
          setDisabled(false);
        }, 1000);
      } else {
        // No match, flip back
        setTimeout(() => {
          updatedCards[firstIndex].flipped = false;
          updatedCards[secondIndex].flipped = false;
          setCards([...updatedCards]);
          setFlippedCards([]);
          setDisabled(false);
        }, 1000);
      }
    }
  };

  // 3. Restart the game
  const restartGame = () => {
    const photos = albums.flatMap((album) => album.photos.slice(0, 5));
    const duplicatedPhotos = [...photos, ...photos].map((photo, index) => ({
      ...photo,
      uniqueId: index,
      matched: false
    }));
    const shuffledPhotos = duplicatedPhotos.sort(() => Math.random() - 0.5);
    setCards(shuffledPhotos);
    setFlippedCards([]);
    setMoves(0);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-4">Memory Game</h1>
      <p className="text-lg mb-4">Moves: {moves}</p>
      <button
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
        onClick={restartGame}
      >
        Restart Game
      </button>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
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
                alt={card.title}
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
