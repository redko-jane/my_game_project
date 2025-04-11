import { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { Holistic } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';
import './App.css';

type Difficulty = 'easy' | 'medium' | 'hard';
type Mushroom = { x: number; y: number; type: 'edible' | 'poisonous' };

const App = () => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('mushroomHighScore') || '0', 10);
  });
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [mushrooms, setMushrooms] = useState<Mushroom[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  const mushroomsRef = useRef(mushrooms);
  useEffect(() => {
    mushroomsRef.current = mushrooms;
  }, [mushrooms]);

  // Параметры сложности
  const difficultySettings = {
    easy: {
      mushroomSpawnInterval: 1500,
      poisonousChance: 0.3,
      initialLives: 5,
      mushroomSpeed: 1,
      removalCount: 3,
      maxMushrooms: 12
    },
    medium: {
      mushroomSpawnInterval: 1000,
      poisonousChance: 0.5,
      initialLives: 3,
      mushroomSpeed: 1.5,
      removalCount: 2,
      maxMushrooms: 15
    },
    hard: {
      mushroomSpawnInterval: 700,
      poisonousChance: 0.7,
      initialLives: 2,
      mushroomSpeed: 2,
      removalCount: 1,
      maxMushrooms: 20
    }
  };

  const resetGame = () => {
    if (score > highScore) {
      const newHighScore = score;
      setHighScore(newHighScore);
      localStorage.setItem('mushroomHighScore', newHighScore.toString());
    }
    setScore(0);
    if (difficulty) {
      setLives(difficultySettings[difficulty].initialLives);
    }
    setMushrooms([]);
    setGameOver(false);
    setGameStarted(true);
  };

  const startGame = (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setLives(difficultySettings[selectedDifficulty].initialLives);
    resetGame();
  };

  // Генерация грибов
  useEffect(() => {
    if (!gameStarted || gameOver || !difficulty) return;

    const settings = difficultySettings[difficulty];

    const generateMushrooms = () => {
      const canvasWidth = canvasRef.current?.width || 640;
      const canvasHeight = canvasRef.current?.height || 480;

      const currentCount = mushroomsRef.current.length;
      if (currentCount < settings.maxMushrooms) {
        const newMushrooms = [];
        const toAdd = Math.min(3, settings.maxMushrooms - currentCount);

        for (let i = 0; i < toAdd; i++) {
          const x = Math.random() * canvasWidth;
          const y = Math.random() * canvasHeight;
          const type = Math.random() > settings.poisonousChance ? 'edible' : 'poisonous';
          newMushrooms.push({ x, y, type });
        }

        setMushrooms(prev => [...prev, ...newMushrooms]);
      }
    };

    generateMushrooms();
    const interval = setInterval(generateMushrooms, settings.mushroomSpawnInterval);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, difficulty]);

  const removeRandomPoisonousMushrooms = (count: number) => {
    setMushrooms(prev => {
      const poisonousIndices = prev
        .map((mushroom, index) => (mushroom.type === 'poisonous' ? index : -1))
        .filter(index => index !== -1);
      
      for (let i = poisonousIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poisonousIndices[i], poisonousIndices[j]] = [poisonousIndices[j], poisonousIndices[i]];
      }
      
      const indicesToRemove = poisonousIndices.slice(0, Math.min(count, poisonousIndices.length));
      return prev.filter((_, index) => !indicesToRemove.includes(index));
    });
  };

  const drawAmanita = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Ножка
    ctx.fillStyle = '#F5DEB3';
    ctx.beginPath();
    ctx.ellipse(x, y + 20, 10, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Шляпка
    ctx.fillStyle = '#FF3333';
    ctx.beginPath();
    ctx.ellipse(x, y - 10, 25, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Пятнышки
    ctx.fillStyle = 'white';
    const spots = [
      {x: x - 15, y: y - 15, r: 5},
      {x: x + 15, y: y - 15, r: 5},
      {x: x, y: y - 10, r: 4},
      {x: x - 18, y: y - 5, r: 4},
      {x: x + 18, y: y - 5, r: 4},
      {x: x - 10, y: y, r: 3},
      {x: x + 10, y: y, r: 3}
    ];
    
    spots.forEach(spot => {
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, spot.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  };

  const drawEdibleMushroom = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // Ножка
    ctx.fillStyle = '#F5DEB3';
    ctx.beginPath();
    ctx.ellipse(x, y + 20, 8, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Шляпка
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(x, y - 10, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Нижняя часть
    ctx.fillStyle = '#F5F5DC';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const holistic = new Holistic({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
    });

    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    const onResults = (results: any) => {
      if (!canvasRef.current || gameOver || !gameStarted) return;

      const canvasCtx = canvasRef.current.getContext('2d');
      if (!canvasCtx) return;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      canvasCtx.scale(-1, 1);
      canvasCtx.translate(-canvasRef.current.width, 0);

      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      canvasCtx.setTransform(1, 0, 0, 1, 0, 0);

      // Рисуем грибы
      mushroomsRef.current.forEach((mushroom) => {
        const correctedX = canvasRef.current!.width - mushroom.x;
        if (mushroom.type === 'poisonous') {
          drawAmanita(canvasCtx, correctedX, mushroom.y);
        } else {
          drawEdibleMushroom(canvasCtx, correctedX, mushroom.y);
        }
      });

      // Обработка касания
      if (results.rightHandLandmarks) {
        const indexFingerTip = results.rightHandLandmarks[8];
        const x = indexFingerTip.x * canvasRef.current.width;
        const y = indexFingerTip.y * canvasRef.current.height;
        const correctedX = canvasRef.current.width - x;

        // Указатель
        canvasCtx.beginPath();
        canvasCtx.arc(correctedX, y, 25, 0, 2 * Math.PI);
        canvasCtx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
        canvasCtx.lineWidth = 3;
        canvasCtx.stroke();
        canvasCtx.closePath();

        // Проверка касания
        mushroomsRef.current.forEach((mushroom, index) => {
          const correctedMushroomX = canvasRef.current!.width - mushroom.x;
          const distance = Math.sqrt((correctedX - correctedMushroomX) ** 2 + (y - mushroom.y) ** 2);
          
          if (distance < 30) {
            if (mushroom.type === 'edible') {
              setScore(prev => prev + 1);
              if (difficulty) {
                removeRandomPoisonousMushrooms(difficultySettings[difficulty].removalCount);
              }
            } else {
              setLives(prev => prev - 1);
            }
            setMushrooms(prev => prev.filter((_, i) => i !== index));
          }
        });
      }

      canvasCtx.restore();

      // Панель статистики
      canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      canvasCtx.fillRect(10, 10, 250, 150);
      
      canvasCtx.fillStyle = 'white';
      canvasCtx.font = 'bold 24px Arial';
      canvasCtx.fillText(`Счет: ${score}`, 20, 40);
      canvasCtx.fillText(`Рекорд: ${highScore}`, 20, 80);
      
      canvasCtx.fillStyle = lives > 1 ? '#00FF00' : '#FF0000';
      canvasCtx.fillText(`Жизни: ${'❤'.repeat(lives)}`, 20, 120);
      
      if (difficulty) {
        canvasCtx.fillStyle = 'white';
        canvasCtx.font = 'bold 18px Arial';
        canvasCtx.fillText(`Уровень: ${difficulty === 'easy' ? 'Лёгкий' : difficulty === 'medium' ? 'Средний' : 'Сложный'}`, 20, 150);
      }
    };

    holistic.onResults(onResults);

    let camera: Camera | null = null;
    if (webcamRef.current?.video) {
      camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          await holistic.send({ image: webcamRef.current!.video! });
        },
      });
      camera.start();
    }

    return () => {
      camera?.stop();
      holistic.close();
    };
  }, [score, lives, gameOver, highScore, gameStarted, difficulty]);

  useEffect(() => {
    if (lives <= 0 && !gameOver && gameStarted) {
      if (score > highScore) {
        const newHighScore = score;
        setHighScore(newHighScore);
        localStorage.setItem('mushroomHighScore', newHighScore.toString());
      }
      setGameOver(true);
    }
  }, [lives, gameOver, score, highScore, gameStarted]);

  if (!difficulty) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f0f0f0'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '10px',
          boxShadow: '0 0 20px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <h1 style={{ marginBottom: '30px', color: '#333' }}>Тихая охота</h1>
          <p style={{ marginBottom: '30px', fontSize: '18px' }}>
            Собирайте съедобные грибы и избегайте мухоморов! Используйте указательный палец для сбора.
          </p>
          
          <h2 style={{ marginBottom: '20px' }}>Выберите уровень сложности:</h2>
          
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button 
              onClick={() => startGame('easy')}
              style={{
                padding: '15px 25px',
                fontSize: '18px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Лёгкий
            </button>
            
            <button 
              onClick={() => startGame('medium')}
              style={{
                padding: '15px 25px',
                fontSize: '18px',
                backgroundColor: '#FFA500',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Средний
            </button>
            
            <button 
              onClick={() => startGame('hard')}
              style={{
                padding: '15px 25px',
                fontSize: '18px',
                backgroundColor: '#F44336',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Сложный
            </button>
          </div>
          
          <div style={{ marginTop: '30px', textAlign: 'left' }}>
            <h3 style={{ marginBottom: '10px' }}>Описание уровней:</h3>
            <ul style={{ listStyleType: 'none', paddingLeft: '0' }}>
              <li style={{ marginBottom: '10px' }}> <strong>Лёгкий</strong>: 5 жизней, 30% ядовитых, медленное появление</li>
              <li style={{ marginBottom: '10px' }}> <strong>Средний</strong>: 3 жизни, 50% ядовитых, средняя скорость</li>
              <li style={{ marginBottom: '10px' }}> <strong>Сложный</strong>: 2 жизни, 70% ядовитых, быстрое появление</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'relative', 
      width: '640px', 
      height: '480px',
      margin: '0 auto'
    }}>
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ 
          display: 'block', 
          border: '2px solid #444',
          borderRadius: '8px'
        }}
      />
      <Webcam
        audio={false}
        mirrored={false}
        ref={webcamRef}
        style={{ display: 'none' }}
      />
      
      {gameOver && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '30px',
          borderRadius: '10px',
          textAlign: 'center',
          width: '300px',
          zIndex: 100
        }}>
          <h2 style={{ marginBottom: '20px' }}>Игра окончена!</h2>
          <p style={{ fontSize: '20px', marginBottom: '10px' }}>Ваш счет: {score}</p>
          <p style={{ 
            fontSize: '20px', 
            marginBottom: '10px'
          }}>
            Уровень: {difficulty === 'easy' ? 'Лёгкий' : difficulty === 'medium' ? 'Средний' : 'Сложный'}
          </p>
          <p style={{ 
            fontSize: '20px', 
            marginBottom: '20px',
            color: score > highScore ? '#4CAF50' : '#FFD700'
          }}>
            {score > highScore ? 'Новый рекорд!' : `Рекорд: ${highScore}`}
          </p>
          <button
            onClick={resetGame}
            style={{
              padding: '10px 20px',
              fontSize: '18px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              width: '100%',
              marginBottom: '10px'
            }}
          >
            Играть снова
          </button>
          <button
            onClick={() => {
              setDifficulty(null);
              setGameStarted(false);
            }}
            style={{
              padding: '10px 20px',
              fontSize: '18px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Выбрать уровень
          </button>
        </div>
      )}
    </div>
  );
};

export default App;