import React from 'react';
import { Achievement, useAchievements } from '@/hooks/useAchievements';
import { X, Trophy, Target, Award } from 'lucide-react';

interface AchievementsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AchievementCard: React.FC<{ achievement: Achievement; progressPercentage: number }> = ({ 
  achievement, 
  progressPercentage 
}) => {
  return (
    <div className={`relative p-3 sm:p-4 rounded-lg border transition-all duration-300 ${
      achievement.unlocked 
        ? 'bg-gradient-to-r from-green-900/50 to-blue-900/50 border-green-400/50 shadow-lg shadow-green-400/20' 
        : 'bg-gray-800/50 border-gray-600/30'
    }`}>
      {achievement.unlocked && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
          <Trophy className="w-3 h-3 text-green-900" />
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <div className={`text-2xl sm:text-3xl transition-all duration-300 ${
          achievement.unlocked ? 'grayscale-0 scale-110' : 'grayscale opacity-50'
        }`}>
          {achievement.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-sm sm:text-base ${
            achievement.unlocked ? 'text-green-400' : 'text-gray-400'
          }`}>
            {achievement.title}
          </h3>
          
          <p className={`text-xs sm:text-sm mt-1 ${
            achievement.unlocked ? 'text-green-300/80' : 'text-gray-500'
          }`}>
            {achievement.description}
          </p>
          
          {achievement.maxProgress && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">
                  {achievement.progress || 0} / {achievement.maxProgress}
                </span>
                <span className="text-gray-400">{progressPercentage}%</span>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    achievement.unlocked 
                      ? 'bg-gradient-to-r from-green-400 to-blue-400' 
                      : 'bg-gradient-to-r from-gray-500 to-gray-600'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
          
          {achievement.unlocked && achievement.unlockedAt && (
            <p className="text-xs text-green-400/60 mt-2">
              Desbloqueado em {new Date(achievement.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ isOpen, onClose }) => {
  const { achievements, stats, unlockedCount, totalCount, getProgressPercentage } = useAchievements();
  
  if (!isOpen) return null;
  
  const completionPercentage = Math.round((unlockedCount / totalCount) * 100);
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-green-400/30 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-green-400/20">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Conquistas</h2>
              <p className="text-sm text-gray-400">
                {unlockedCount} de {totalCount} desbloqueadas ({completionPercentage}%)
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="px-4 sm:px-6 py-3 bg-gray-800/50">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progresso Geral</span>
            <span className="text-green-400 font-bold">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="h-3 rounded-full bg-gradient-to-r from-green-400 to-blue-400 transition-all duration-1000"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
        
        {/* Stats Summary */}
        <div className="px-4 sm:px-6 py-3 bg-gray-800/30 border-b border-gray-700/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg sm:text-xl font-bold text-green-400">{stats.totalBugs}</div>
              <div className="text-xs text-gray-400">Bugs Eliminados</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-blue-400">{stats.gamesPlayed}</div>
              <div className="text-xs text-gray-400">Partidas Jogadas</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-purple-400">{stats.highestScore.toLocaleString()}</div>
              <div className="text-xs text-gray-400">Maior Pontuação</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-yellow-400">{stats.highestLevel}</div>
              <div className="text-xs text-gray-400">Maior Nível</div>
            </div>
          </div>
        </div>
        
        {/* Achievements Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid gap-3 sm:gap-4">
            {achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                progressPercentage={getProgressPercentage(achievement)}
              />
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-gray-800/50 border-t border-gray-700/50">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Target className="w-4 h-4" />
            <span>Continue jogando para desbloquear mais conquistas!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementsPanel;