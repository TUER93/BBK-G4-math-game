// 音频管理器
class AudioManager {
    constructor() {
        this.bgMusic = null;
        this.soundEffects = {};
        this.consecutiveCorrect = 0;
        this.isMuted = false;
        
        this.init();
    }
    
    init() {
        // 背景音乐
        this.bgMusic = new Audio('audio/游戏背景音乐.mp3');
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.3; // 背景音乐音量30%
        
        // 音效
        this.soundEffects = {
            correct: new Audio('audio/太棒了.mp3'),
            double: new Audio('audio/双杀.mp3'),
            triple: new Audio('audio/三杀.mp3'),
            quadra: new Audio('audio/四杀.mp3'),
            penta: new Audio('audio/五杀.mp3'),
            godlike: new Audio('audio/超神.mp3'),
            wrong: new Audio('audio/做错音乐.mp3'),
            upgrade: new Audio('audio/升级.mp3'),
            gift: new Audio('audio/谢谢.mp3')
        };
        
        // 设置音效音量
        Object.values(this.soundEffects).forEach(audio => {
            audio.volume = 0.6; // 音效音量60%
        });
    }
    
    // 播放背景音乐
    playBGM() {
        if (!this.isMuted && this.bgMusic) {
            this.bgMusic.play().catch(err => {
                console.log('背景音乐播放失败:', err);
                // 某些浏览器需要用户交互后才能播放
            });
        }
    }
    
    // 停止背景音乐
    stopBGM() {
        if (this.bgMusic) {
            this.bgMusic.pause();
            this.bgMusic.currentTime = 0;
        }
    }
    
    // 暂停背景音乐
    pauseBGM() {
        if (this.bgMusic) {
            this.bgMusic.pause();
        }
    }
    
    // 恢复背景音乐
    resumeBGM() {
        if (!this.isMuted && this.bgMusic) {
            this.bgMusic.play().catch(err => {
                console.log('恢复背景音乐失败:', err);
            });
        }
    }
    
    // 答对题目时播放音效
    playCorrectSound() {
        this.consecutiveCorrect++;
        
        let soundToPlay = null;
        let killText = '';
        
        switch(this.consecutiveCorrect) {
            case 1:
                soundToPlay = this.soundEffects.correct;
                killText = '太棒了!';
                break;
            case 2:
                soundToPlay = this.soundEffects.double;
                killText = '🔥 双杀 Double Kill!';
                break;
            case 3:
                soundToPlay = this.soundEffects.triple;
                killText = '🔥🔥 三杀 Triple Kill!';
                break;
            case 4:
                soundToPlay = this.soundEffects.quadra;
                killText = '🔥🔥🔥 四杀 Quadra Kill!';
                break;
            case 5:
                soundToPlay = this.soundEffects.penta;
                killText = '🔥🔥🔥🔥🔥 五杀 PENTA KILL!!!';
                break;
            default:
                // 6次及以上播放超神
                soundToPlay = this.soundEffects.godlike;
                killText = '⚡⚡⚡ 超神 GOD LIKE!!!';
                break;
        }
        
        if (soundToPlay && !this.isMuted) {
            // 停止之前的音效
            Object.values(this.soundEffects).forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
            
            soundToPlay.play().catch(err => {
                console.log('音效播放失败:', err);
            });
        }
        
        return { killCount: this.consecutiveCorrect, killText };
    }
    
    // 答错时播放音效
    playWrongSound() {
        if (this.soundEffects.wrong && !this.isMuted) {
            // 停止之前的音效
            Object.values(this.soundEffects).forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
            
            this.soundEffects.wrong.play().catch(err => {
                console.log('做错音效播放失败:', err);
            });
        }
    }
    
    // 答错时重置连杀
    resetStreak() {
        this.consecutiveCorrect = 0;
    }
    
    // 获取当前连杀数
    getStreak() {
        return this.consecutiveCorrect;
    }
    
    // 播放升级音效
    playUpgradeSound() {
        if (this.soundEffects.upgrade && !this.isMuted) {
            this.soundEffects.upgrade.currentTime = 0;
            this.soundEffects.upgrade.play().catch(err => {
                console.log('升级音效播放失败:', err);
            });
        }
    }
    
    // 播放赠送音效
    playGiftSound() {
        if (this.soundEffects.gift && !this.isMuted) {
            this.soundEffects.gift.currentTime = 0;
            this.soundEffects.gift.play().catch(err => {
                console.log('赠送音效播放失败:', err);
            });
        }
    }
    
    // 切换静音
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.pauseBGM();
        } else {
            this.resumeBGM();
        }
        
        return this.isMuted;
    }
    
    // 设置背景音乐音量
    setBGMVolume(volume) {
        if (this.bgMusic) {
            this.bgMusic.volume = Math.max(0, Math.min(1, volume));
        }
    }
    
    // 设置音效音量
    setSFXVolume(volume) {
        const vol = Math.max(0, Math.min(1, volume));
        Object.values(this.soundEffects).forEach(audio => {
            audio.volume = vol;
        });
    }
}

// 导出音频管理器实例
const audioManager = new AudioManager();
