import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Confetti from 'react-confetti';

type Difficulty = 'easy' | 'medium' | 'hard';
type CellValue = number | null;
type Board = CellValue[][];

interface BestScore {
  time: number;
  mistakes: number;
  date: string;
}

interface Statistics {
  easy: BestScore | null;
  medium: BestScore | null;
  hard: BestScore | null;
  totalGames: number;
}

const generateSudoku = (difficulty: Difficulty): { puzzle: Board; solution: Board } => {
  const solution: Board = Array(9).fill(null).map(() => Array(9).fill(null));
  
  const isValid = (board: Board, row: number, col: number, num: number): boolean => {
    for (let x = 0; x < 9; x++) {
      if (board[row][x] === num || board[x][col] === num) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[startRow + i][startCol + j] === num) return false;
      }
    }
    return true;
  };

  const fillBoard = (board: Board): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === null) {
          const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const num of numbers) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              if (fillBoard(board)) return true;
              board[row][col] = null;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  fillBoard(solution);
  
  const puzzle = solution.map(row => [...row]);
  const cellsToRemove = difficulty === 'easy' ? 35 : difficulty === 'medium' ? 45 : 55;
  
  let removed = 0;
  while (removed < cellsToRemove) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (puzzle[row][col] !== null) {
      puzzle[row][col] = null;
      removed++;
    }
  }

  return { puzzle, solution };
};

export default function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [board, setBoard] = useState<Board>([]);
  const [initialBoard, setInitialBoard] = useState<Board>([]);
  const [solution, setSolution] = useState<Board>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [gamesWon, setGamesWon] = useState(0);
  const [statistics, setStatistics] = useState<Statistics>(() => {
    const saved = localStorage.getItem('sudoku-statistics');
    return saved ? JSON.parse(saved) : { easy: null, medium: null, hard: null, totalGames: 0 };
  });
  const [currentView, setCurrentView] = useState<'menu' | 'game'>('menu');
  const [mistakes, setMistakes] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showVictory, setShowVictory] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [sakuraParticles, setSakuraParticles] = useState<Array<{id: number, x: number, delay: number, duration: number}>>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    const savedGamesWon = localStorage.getItem('sudoku-games-won');
    if (savedGamesWon) {
      setGamesWon(parseInt(savedGamesWon));
    }
    
    const particles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 4
    }));
    setSakuraParticles(particles);
  }, []);

  useEffect(() => {
    localStorage.setItem('sudoku-games-won', gamesWon.toString());
  }, [gamesWon]);

  const startNewGame = (diff: Difficulty) => {
    const { puzzle, solution: sol } = generateSudoku(diff);
    setBoard(puzzle);
    setInitialBoard(puzzle.map(row => [...row]));
    setSolution(sol);
    setDifficulty(diff);
    setTimer(0);
    setIsRunning(true);
    setSelectedCell(null);
    setMistakes(0);
    setCurrentView('game');
    setShowVictory(false);
    setShowConfetti(false);
  };

  const handleCellClick = (row: number, col: number) => {
    if (initialBoard[row][col] === null) {
      setSelectedCell([row, col]);
    }
  };

  const playSound = (frequency: number, duration: number, type: 'correct' | 'wrong' | 'win' = 'correct') => {
    if (!soundEnabled) return;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const ctx = audioContextRef.current;
    
    if (type === 'correct') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.05);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
      osc.type = 'sawtooth';
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } else if (type === 'win') {
      const frequencies = [523.25, 587.33, 659.25, 783.99, 880.00];
      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.value = freq;
        osc.type = 'sine';
        
        const startTime = ctx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    }
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    if (initialBoard[row][col] !== null) return;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = num;
    
    if (solution[row][col] !== num) {
      setMistakes(m => m + 1);
      playSound(200, 0.2, 'wrong');
    } else {
      playSound(523.25, 0.15, 'correct');
    }
    
    setBoard(newBoard);
    checkWin(newBoard);
  };

  const checkWin = (currentBoard: Board) => {
    const isComplete = currentBoard.every((row, i) =>
      row.every((cell, j) => cell === solution[i][j])
    );
    if (isComplete) {
      setIsRunning(false);
      setGamesWon(g => g + 1);
      setShowConfetti(true);
      setShowVictory(true);
      
      const newStats = { ...statistics };
      newStats.totalGames += 1;
      
      const currentScore: BestScore = {
        time: timer,
        mistakes: mistakes,
        date: new Date().toLocaleDateString('ru-RU')
      };
      
      const bestScore = newStats[difficulty];
      if (!bestScore || timer < bestScore.time || (timer === bestScore.time && mistakes < bestScore.mistakes)) {
        newStats[difficulty] = currentScore;
      }
      
      setStatistics(newStats);
      localStorage.setItem('sudoku-statistics', JSON.stringify(newStats));
      
      if (soundEnabled) {
        playSound(523.25, 0.5, 'win');
      }
      
      setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
    }
  };

  const getHint = () => {
    if (!selectedCell || !hintsEnabled) return;
    const [row, col] = selectedCell;
    if (initialBoard[row][col] !== null) return;
    
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = solution[row][col];
    setBoard(newBoard);
    checkWin(newBoard);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCellClassName = (row: number, col: number) => {
    const isSelected = selectedCell?.[0] === row && selectedCell?.[1] === col;
    const isInitial = initialBoard[row][col] !== null;
    const isWrong = board[row][col] !== null && board[row][col] !== solution[row][col];
    
    return `w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border-2 border-foreground cursor-pointer
      transition-all duration-150 hover:bg-accent/50 font-bold text-lg
      ${isSelected ? 'bg-primary/20 shadow-[2px_2px_0_hsl(var(--foreground))]' : ''}
      ${isInitial ? 'bg-background text-foreground' : 'text-primary bg-card'}
      ${isWrong ? 'text-destructive' : ''}
      ${col % 3 === 2 && col !== 8 ? 'border-r-4 border-r-foreground' : ''}
      ${row % 3 === 2 && row !== 8 ? 'border-b-4 border-b-foreground' : ''}`;
  };

  if (currentView === 'menu') {
    return (
      <div className="min-h-screen paper-texture bg-gradient-to-b from-background to-secondary p-4 sm:p-8 relative overflow-hidden">
        {sakuraParticles.map(particle => (
          <div
            key={particle.id}
            className="sakura-petal"
            style={{
              left: `${particle.x}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s, 3s`
            }}
          />
        ))}
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-8 animate-fade-in relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 opacity-10">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"/>
                <text x="50" y="60" textAnchor="middle" fontSize="40" fill="currentColor" className="text-primary font-bold">禅</text>
              </svg>
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold text-foreground mb-2 relative brush-stroke">数独</h1>
            <p className="text-lg text-muted-foreground tracking-widest">SUDOKU</p>
            <div className="flex justify-center items-center gap-3 mt-6">
              <div className="w-16 h-0.5 bg-primary"></div>
              <div className="w-2 h-2 rotate-45 bg-primary"></div>
              <div className="w-16 h-0.5 bg-primary"></div>
            </div>
          </div>

          <Tabs defaultValue="levels" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-card japanese-card border-foreground">
              <TabsTrigger value="levels" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                <Icon name="Grid3x3" size={18} className="mr-2" />
                Уровни
              </TabsTrigger>
              <TabsTrigger value="rules" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                <Icon name="BookOpen" size={18} className="mr-2" />
                Правила
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                <Icon name="Settings" size={18} className="mr-2" />
                Настройки
              </TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                <Icon name="User" size={18} className="mr-2" />
                Профиль
              </TabsTrigger>
            </TabsList>

            <TabsContent value="levels" className="animate-fade-in">
              <Card className="p-6 sm:p-8 japanese-card bg-card paper-texture">
                <h2 className="text-3xl font-bold text-center mb-6 text-foreground">Выберите сложность</h2>
                <div className="grid gap-4">
                  <Button 
                    onClick={() => startNewGame('easy')}
                    className="h-20 text-lg bg-card japanese-card border-foreground text-foreground hover:bg-secondary font-medium group"
                  >
                    <div className="flex items-center justify-between w-full px-4">
                      <div className="flex items-center gap-3">
                        <Icon name="Cherry" size={32} className="text-primary group-hover:scale-110 transition-transform" />
                        <div className="text-left">
                          <p className="text-xl font-bold">Новичок</p>
                          <p className="text-sm text-muted-foreground">для начинающих</p>
                        </div>
                      </div>
                      <span className="text-3xl opacity-20">一</span>
                    </div>
                  </Button>
                  <Button 
                    onClick={() => startNewGame('medium')}
                    className="h-20 text-lg bg-card japanese-card border-foreground text-foreground hover:bg-accent font-medium group"
                  >
                    <div className="flex items-center justify-between w-full px-4">
                      <div className="flex items-center gap-3">
                        <Icon name="Mountain" size={32} className="text-primary group-hover:scale-110 transition-transform" />
                        <div className="text-left">
                          <p className="text-xl font-bold">Средний</p>
                          <p className="text-sm text-muted-foreground">для опытных</p>
                        </div>
                      </div>
                      <span className="text-3xl opacity-20">二</span>
                    </div>
                  </Button>
                  <Button 
                    onClick={() => startNewGame('hard')}
                    className="h-20 text-lg bg-card japanese-card border-foreground text-foreground hover:bg-primary/10 font-medium group"
                  >
                    <div className="flex items-center justify-between w-full px-4">
                      <div className="flex items-center gap-3">
                        <Icon name="Zap" size={32} className="text-primary group-hover:scale-110 transition-transform" />
                        <div className="text-left">
                          <p className="text-xl font-bold">Эксперт</p>
                          <p className="text-sm text-muted-foreground">для мастеров</p>
                        </div>
                      </div>
                      <span className="text-3xl opacity-20">三</span>
                    </div>
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="rules" className="animate-fade-in">
              <Card className="p-6 sm:p-8 pb-8 japanese-card bg-card paper-texture">
                <h2 className="text-3xl font-bold text-center mb-6 text-foreground">Правила игры</h2>
                <div className="space-y-4 text-foreground/90">
                  <div className="flex items-start gap-3 p-3 japanese-card bg-background/50">
                    <span className="text-2xl font-bold text-primary">一</span>
                    <p>Заполните сетку 9×9 цифрами от 1 до 9</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 japanese-card bg-background/50">
                    <span className="text-2xl font-bold text-primary">二</span>
                    <p>В каждой строке должны быть цифры от 1 до 9 без повторений</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 japanese-card bg-background/50">
                    <span className="text-2xl font-bold text-primary">三</span>
                    <p>В каждом столбце должны быть цифры от 1 до 9 без повторений</p>
                  </div>
                  <div className="flex items-start gap-3 p-3 japanese-card bg-background/50">
                    <span className="text-2xl font-bold text-primary">四</span>
                    <p>В каждом блоке 3×3 должны быть цифры от 1 до 9 без повторений</p>
                  </div>
                  <div className="mt-6 p-4 bg-accent/30 japanese-card border-foreground">
                    <p className="text-center font-medium flex items-center justify-center gap-2">
                      <span className="text-2xl">🧘</span>
                      <span>Решайте с концентрацией и логикой</span>
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="animate-fade-in">
              <Card className="p-6 sm:p-8 japanese-card bg-card paper-texture">
                <h2 className="text-3xl font-bold text-center mb-6 text-foreground">Настройки</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 japanese-card bg-background">
                    <div className="flex items-center gap-3">
                      <Icon name="Lightbulb" size={24} className="text-primary" />
                      <Label htmlFor="hints" className="text-lg cursor-pointer font-medium">Подсказки</Label>
                    </div>
                    <Switch 
                      id="hints" 
                      checked={hintsEnabled} 
                      onCheckedChange={setHintsEnabled}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 japanese-card bg-background">
                    <div className="flex items-center gap-3">
                      <Icon name="Volume2" size={24} className="text-primary" />
                      <Label htmlFor="sound" className="text-lg cursor-pointer font-medium">Звуковые эффекты</Label>
                    </div>
                    <Switch 
                      id="sound" 
                      checked={soundEnabled} 
                      onCheckedChange={setSoundEnabled}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  <div className="p-4 bg-accent/30 japanese-card border-foreground">
                    <p className="text-sm text-center text-foreground/80">
                      Подсказки помогут в трудной ситуации, но старайтесь решать самостоятельно!
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="animate-fade-in">
              <Card className="p-6 sm:p-8 pb-8 japanese-card bg-card paper-texture">
                <h2 className="text-3xl font-bold text-center mb-6 text-foreground">Профиль игрока</h2>
                <div className="flex flex-col items-center gap-6">
                  <div className="w-28 h-28 japanese-card bg-background flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-20 h-20">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"/>
                        <text x="50" y="65" textAnchor="middle" fontSize="35" fill="currentColor" className="text-primary font-bold">人</text>
                      </svg>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-1">Мастер Судоку</h3>
                    <p className="text-muted-foreground text-sm">путь совершенствования</p>
                  </div>
                  
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-6 japanese-card bg-background text-center">
                      <Icon name="Flame" size={32} className="mx-auto mb-2 text-primary" />
                      <p className="text-4xl font-bold text-foreground">{statistics.totalGames}</p>
                      <p className="text-sm text-muted-foreground mt-1">Всего игр</p>
                    </div>
                    <div className="p-6 japanese-card bg-background text-center">
                      <Icon name="Award" size={32} className="mx-auto mb-2 text-primary" />
                      <p className="text-4xl font-bold text-foreground">{gamesWon}</p>
                      <p className="text-sm text-muted-foreground mt-1">Побед</p>
                    </div>
                  </div>

                  <div className="w-full space-y-4 mt-4">
                    <h3 className="text-xl font-bold text-center text-foreground mb-4 flex items-center justify-center gap-2">
                      <span>🏆</span>
                      <span>Лучшие результаты</span>
                    </h3>
                    
                    <div className="space-y-3">
                      {(['easy', 'medium', 'hard'] as const).map((level) => {
                        const levelNames = { easy: 'Новичок', medium: 'Средний', hard: 'Эксперт' };
                        const levelIcons = { easy: 'Cherry', medium: 'Mountain', hard: 'Zap' };
                        const levelKanji = { easy: '一', medium: '二', hard: '三' };
                        const score = statistics[level];
                        
                        return (
                          <div key={level} className="p-4 japanese-card bg-background">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <Icon name={levelIcons[level]} size={28} className="text-primary" />
                                  <span className="absolute -top-1 -right-1 text-xs font-bold text-primary">{levelKanji[level]}</span>
                                </div>
                                <div>
                                  <p className="font-bold text-lg">{levelNames[level]}</p>
                                  {score ? (
                                    <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                                      <span className="flex items-center gap-1">
                                        <Icon name="Clock" size={14} />
                                        {Math.floor(score.time / 60)}:{(score.time % 60).toString().padStart(2, '0')}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Icon name="AlertCircle" size={14} />
                                        {score.mistakes}
                                      </span>
                                      <span className="text-xs">{score.date}</span>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground mt-1">Нет результата</p>
                                  )}
                                </div>
                              </div>
                              {score && (
                                <Icon name="Medal" size={28} className="text-primary" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="mt-8 p-4 japanese-card bg-card border-foreground">
            <p className="text-sm text-muted-foreground text-center">
              Создатель: <span className="text-primary font-medium">tenotikk</span> • Связь: <a href="https://t.me/tenonotik" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">@tenonotik</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen paper-texture bg-gradient-to-b from-background to-secondary p-4 sm:p-8 relative overflow-hidden">
      {sakuraParticles.map(particle => (
        <div
          key={particle.id}
          className="sakura-petal"
          style={{
            left: `${particle.x}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s, 3s`
          }}
        />
      ))}
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} gravity={0.3} colors={['#DC143C', '#FFB7C5', '#FFF8DC', '#8B0000', '#FF69B4']} />}
      
      <Dialog open={showVictory} onOpenChange={setShowVictory}>
        <DialogContent className="sm:max-w-md japanese-card bg-card paper-texture">
          <DialogHeader>
            <DialogTitle className="text-center text-4xl font-bold text-foreground">🎊 Победа 🎊</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-4">
            <div className="flex justify-center">
              <div className="relative">
                <Icon name="Trophy" size={80} className="text-primary animate-scale-in" />
                <div className="absolute -top-2 -right-2 w-12 h-12 japanese-card bg-background flex items-center justify-center text-2xl">🎯</div>
              </div>
            </div>
            <p className="text-2xl font-bold">Завершено!</p>
            
            {statistics[difficulty] && 
             (timer < statistics[difficulty]!.time || 
              (timer === statistics[difficulty]!.time && mistakes <= statistics[difficulty]!.mistakes)) && (
              <div className="p-3 japanese-card bg-primary/10 border-primary animate-fade-in">
                <p className="text-sm font-bold text-primary flex items-center justify-center gap-2">
                  <span className="text-xl">⭐</span>
                  Новый рекорд!
                  <span className="text-xl">⭐</span>
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-4 japanese-card bg-background">
                <Icon name="Clock" size={24} className="mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Время</p>
                <p className="text-lg font-bold">{formatTime(timer)}</p>
              </div>
              <div className="p-4 japanese-card bg-background">
                <Icon name="AlertCircle" size={24} className="mx-auto mb-2 text-destructive" />
                <p className="text-sm text-muted-foreground">Ошибки</p>
                <p className="text-lg font-bold">{mistakes}</p>
              </div>
            </div>
            
            {statistics[difficulty] && (
              <div className="p-3 japanese-card bg-background text-sm">
                <p className="text-muted-foreground mb-1">Лучший результат:</p>
                <p className="font-semibold">
                  {formatTime(statistics[difficulty]!.time)} • {statistics[difficulty]!.mistakes} ошибок
                </p>
              </div>
            )}
            
            <Button 
              onClick={() => {
                setShowVictory(false);
                setCurrentView('menu');
              }}
              className="w-full mt-4 japanese-card bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              В меню
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="outline" 
            onClick={() => setCurrentView('menu')}
            className="japanese-card hover:bg-secondary font-medium"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Меню
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 japanese-card bg-card px-4 py-2">
              <Icon name="Clock" size={20} className="text-primary" />
              <span className="font-bold">{formatTime(timer)}</span>
            </div>
            <div className="flex items-center gap-2 japanese-card bg-card px-4 py-2">
              <Icon name="XCircle" size={20} className="text-destructive" />
              <span className="font-bold">{mistakes}</span>
            </div>
          </div>
        </div>

        <Card className="p-4 sm:p-6 japanese-card bg-card paper-texture mb-6">
          <div className="flex justify-center mb-4">
            <div className="inline-block border-4 border-foreground p-2 bg-background">
              {board.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                  {row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      className={getCellClassName(rowIndex, colIndex)}
                    >
                      {cell || ''}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-9 gap-2 max-w-md mx-auto mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <Button
                key={num}
                onClick={() => handleNumberInput(num)}
                disabled={!selectedCell}
                className="h-12 text-lg font-bold japanese-card bg-background text-foreground hover:bg-accent disabled:opacity-50"
              >
                {num}
              </Button>
            ))}
          </div>

          <div className="flex justify-center gap-3 flex-wrap">
            {hintsEnabled && (
              <Button
                onClick={getHint}
                disabled={!selectedCell}
                className="japanese-card bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                <Icon name="Lightbulb" size={20} className="mr-2" />
                Подсказка
              </Button>
            )}
            <Button
              onClick={() => startNewGame(difficulty)}
              className="japanese-card bg-card hover:bg-secondary font-medium text-foreground"
            >
              <Icon name="RotateCw" size={20} className="mr-2" />
              Новая игра
            </Button>
          </div>
        </Card>
      </div>
      
      <div className="max-w-4xl mx-auto mt-8 relative z-10">
        <div className="p-4 japanese-card bg-card border-foreground">
          <p className="text-sm text-muted-foreground text-center">
            Создатель: <span className="text-primary font-medium">tenotikk</span> • Связь: <a href="https://t.me/tenonotik" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">@tenonotik</a>
          </p>
        </div>
      </div>
    </div>
  );
}