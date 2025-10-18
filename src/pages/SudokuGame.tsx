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
  const [currentView, setCurrentView] = useState<'menu' | 'game'>('menu');
  const [mistakes, setMistakes] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showVictory, setShowVictory] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

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
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type === 'win' ? 'sine' : 'triangle';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
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
      
      if (soundEnabled) {
        setTimeout(() => playSound(523.25, 0.2, 'win'), 0);
        setTimeout(() => playSound(659.25, 0.2, 'win'), 150);
        setTimeout(() => playSound(783.99, 0.2, 'win'), 300);
        setTimeout(() => playSound(1046.50, 0.4, 'win'), 450);
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
    
    return `w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border border-primary/30 cursor-pointer
      transition-all duration-200 hover:bg-secondary/50 font-semibold text-lg
      ${isSelected ? 'bg-accent ring-2 ring-primary' : ''}
      ${isInitial ? 'bg-card text-foreground font-bold' : 'text-primary'}
      ${isWrong ? 'text-destructive' : ''}
      ${col % 3 === 2 && col !== 8 ? 'border-r-2 border-r-primary/60' : ''}
      ${row % 3 === 2 && row !== 8 ? 'border-b-2 border-b-primary/60' : ''}`;
  };

  if (currentView === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-5xl sm:text-7xl font-bold text-primary mb-2">Судоку</h1>
            <p className="text-xl text-muted-foreground italic">~ Элегантная головоломка ~</p>
            <div className="flex justify-center gap-2 mt-4">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
              <div className="w-3 h-3 rounded-full bg-secondary animate-pulse delay-100"></div>
              <div className="w-3 h-3 rounded-full bg-accent animate-pulse delay-200"></div>
            </div>
          </div>

          <Tabs defaultValue="levels" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-card vintage-shadow">
              <TabsTrigger value="levels" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Icon name="Grid3x3" size={18} className="mr-2" />
                Уровни
              </TabsTrigger>
              <TabsTrigger value="rules" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Icon name="BookOpen" size={18} className="mr-2" />
                Правила
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Icon name="Settings" size={18} className="mr-2" />
                Настройки
              </TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Icon name="User" size={18} className="mr-2" />
                Профиль
              </TabsTrigger>
            </TabsList>

            <TabsContent value="levels" className="animate-fade-in">
              <Card className="p-6 sm:p-8 vintage-shadow bg-card/80 backdrop-blur">
                <h2 className="text-3xl font-bold text-center mb-6 text-primary">Выберите сложность</h2>
                <div className="grid gap-4">
                  <Button 
                    onClick={() => startNewGame('easy')}
                    className="h-16 text-lg bg-gradient-to-r from-secondary to-accent text-foreground hover:scale-105 transition-transform vintage-shadow"
                  >
                    <Icon name="Flower" size={24} className="mr-3" />
                    Легкий уровень
                  </Button>
                  <Button 
                    onClick={() => startNewGame('medium')}
                    className="h-16 text-lg bg-gradient-to-r from-accent to-primary text-primary-foreground hover:scale-105 transition-transform vintage-shadow"
                  >
                    <Icon name="Sparkles" size={24} className="mr-3" />
                    Средний уровень
                  </Button>
                  <Button 
                    onClick={() => startNewGame('hard')}
                    className="h-16 text-lg bg-gradient-to-r from-primary to-purple-600 text-primary-foreground hover:scale-105 transition-transform vintage-shadow"
                  >
                    <Icon name="Crown" size={24} className="mr-3" />
                    Сложный уровень
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="rules" className="animate-fade-in">
              <Card className="p-6 sm:p-8 vintage-shadow bg-card/80 backdrop-blur">
                <h2 className="text-3xl font-bold text-center mb-6 text-primary">Правила игры</h2>
                <div className="space-y-4 text-foreground/90">
                  <div className="flex items-start gap-3">
                    <Icon name="Check" size={20} className="text-primary mt-1 flex-shrink-0" />
                    <p>Заполните сетку 9×9 цифрами от 1 до 9</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon name="Check" size={20} className="text-primary mt-1 flex-shrink-0" />
                    <p>В каждой строке должны быть все цифры от 1 до 9 без повторений</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon name="Check" size={20} className="text-primary mt-1 flex-shrink-0" />
                    <p>В каждом столбце должны быть все цифры от 1 до 9 без повторений</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon name="Check" size={20} className="text-primary mt-1 flex-shrink-0" />
                    <p>В каждом квадрате 3×3 должны быть все цифры от 1 до 9 без повторений</p>
                  </div>
                  <div className="mt-6 p-4 bg-secondary/30 rounded-lg border border-primary/20">
                    <p className="text-sm text-center italic">💡 Используйте логику и внимательность для решения головоломки</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="animate-fade-in">
              <Card className="p-6 sm:p-8 vintage-shadow bg-card/80 backdrop-blur">
                <h2 className="text-3xl font-bold text-center mb-6 text-primary">Настройки</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon name="Lightbulb" size={24} className="text-primary" />
                      <Label htmlFor="hints" className="text-lg cursor-pointer">Включить подсказки</Label>
                    </div>
                    <Switch 
                      id="hints" 
                      checked={hintsEnabled} 
                      onCheckedChange={setHintsEnabled}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon name="Volume2" size={24} className="text-primary" />
                      <Label htmlFor="sound" className="text-lg cursor-pointer">Звуковые эффекты</Label>
                    </div>
                    <Switch 
                      id="sound" 
                      checked={soundEnabled} 
                      onCheckedChange={setSoundEnabled}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  <div className="p-4 bg-accent/20 rounded-lg border border-primary/20">
                    <p className="text-sm text-center text-muted-foreground">
                      Подсказки помогут вам в сложных ситуациях, но постарайтесь обойтись без них!
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="animate-fade-in">
              <Card className="p-6 sm:p-8 vintage-shadow bg-card/80 backdrop-blur">
                <h2 className="text-3xl font-bold text-center mb-6 text-primary">Профиль игрока</h2>
                <div className="flex flex-col items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center vintage-shadow">
                    <Icon name="User" size={48} className="text-white" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">Судоку Мастер</h3>
                    <p className="text-muted-foreground">Элегантный игрок</p>
                  </div>
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-6 bg-gradient-to-br from-secondary to-accent rounded-lg text-center vintage-shadow">
                      <Icon name="Trophy" size={32} className="mx-auto mb-2 text-primary" />
                      <p className="text-3xl font-bold text-primary">{gamesWon}</p>
                      <p className="text-sm text-muted-foreground mt-1">Побед</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-accent to-primary/20 rounded-lg text-center vintage-shadow">
                      <Icon name="Star" size={32} className="mx-auto mb-2 text-primary" />
                      <p className="text-3xl font-bold text-primary">{difficulty}</p>
                      <p className="text-sm text-muted-foreground mt-1">Последний уровень</p>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-accent p-4 sm:p-8 relative">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} gravity={0.3} colors={['#8B5CF6', '#FFDEE2', '#E5DEFF', '#FEF7CD', '#D946EF']} />}
      
      <Dialog open={showVictory} onOpenChange={setShowVictory}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-secondary to-accent border-primary/40">
          <DialogHeader>
            <DialogTitle className="text-center text-4xl font-bold text-primary">🎀 Поздравляю! 🎀</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-4">
            <div className="flex justify-center">
              <Icon name="Trophy" size={80} className="text-primary animate-scale-in" />
            </div>
            <p className="text-xl font-semibold">Вы решили судоку!</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-background/50 rounded-lg">
                <Icon name="Clock" size={24} className="mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Время</p>
                <p className="text-lg font-bold">{formatTime(timer)}</p>
              </div>
              <div className="p-4 bg-background/50 rounded-lg">
                <Icon name="AlertCircle" size={24} className="mx-auto mb-2 text-destructive" />
                <p className="text-sm text-muted-foreground">Ошибки</p>
                <p className="text-lg font-bold">{mistakes}</p>
              </div>
            </div>
            <Button 
              onClick={() => {
                setShowVictory(false);
                setCurrentView('menu');
              }}
              className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Вернуться в меню
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="outline" 
            onClick={() => setCurrentView('menu')}
            className="vintage-shadow hover:bg-secondary"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Меню
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg vintage-shadow">
              <Icon name="Clock" size={20} className="text-primary" />
              <span className="font-bold">{formatTime(timer)}</span>
            </div>
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg vintage-shadow">
              <Icon name="AlertCircle" size={20} className="text-destructive" />
              <span className="font-bold">{mistakes}</span>
            </div>
          </div>
        </div>

        <Card className="p-4 sm:p-6 vintage-shadow bg-card/80 backdrop-blur mb-6">
          <div className="flex justify-center mb-4">
            <div className="inline-block border-4 border-primary/40 rounded-lg p-2 bg-background/50">
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
                className="h-12 text-lg font-bold bg-gradient-to-br from-secondary to-accent text-foreground hover:scale-110 transition-transform vintage-shadow disabled:opacity-50"
              >
                {num}
              </Button>
            ))}
          </div>

          <div className="flex justify-center gap-3">
            {hintsEnabled && (
              <Button
                onClick={getHint}
                disabled={!selectedCell}
                className="bg-primary text-primary-foreground hover:bg-primary/90 vintage-shadow"
              >
                <Icon name="Lightbulb" size={20} className="mr-2" />
                Подсказка
              </Button>
            )}
            <Button
              onClick={() => startNewGame(difficulty)}
              variant="outline"
              className="vintage-shadow hover:bg-secondary"
            >
              <Icon name="RotateCw" size={20} className="mr-2" />
              Новая игра
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}