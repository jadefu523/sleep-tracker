import React, { useState, useEffect, useMemo } from 'react';
import { Moon, Clock, Calendar, Trash2, BedDouble, Star, User, Settings } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
// 你的專屬 Firebase 設定 (已幫你填好)
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
const firebaseConfig = {
  apiKey: "AIzaSyCt5qobh-bCz_2jBzM1n4YjjLfar86zdQQ",
  authDomain: "sleep-tracker-d4203.firebaseapp.com",
  projectId: "sleep-tracker-d4203",
  storageBucket: "sleep-tracker-d4203.firebasestorage.app",
  messagingSenderId: "263830928526",
  appId: "1:263830928526:web:ca4f797bef53737d3d1ddf",
  measurementId: "G-4SDQW92J4B"
};

// 初始化 Firebase (防止重複初始化報錯)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const COLLECTION_NAME = 'sleep_logs';

export default function App() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [justAdded, setJustAdded] = useState(false);
  const [identity, setIdentity] = useState(localStorage.getItem('sleep_identity') || null);

  // 1. 自動匿名登入
  useEffect(() => {
    signInAnonymously(auth).catch((error) => {
        console.error("登入錯誤:", error);
        alert("登入失敗，請確認 Firebase Authentication 的匿名登入已開啟！");
    });
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. 監聽資料庫
  useEffect(() => {
    const logsCollection = collection(db, COLLECTION_NAME);
    const unsubscribe = onSnapshot(logsCollection, (snapshot) => {
        const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedLogs.sort((a, b) => b.timestamp - a.timestamp);
        setLogs(fetchedLogs);
        setLoading(false);
      }, (error) => {
        console.error("讀取錯誤:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 3. 設定身分
  const handleSetIdentity = (name) => {
    setIdentity(name);
    localStorage.setItem('sleep_identity', name);
  };

  const handleResetIdentity = () => {
    if(confirm('要重新選擇身分嗎？')) {
        setIdentity(null);
        localStorage.removeItem('sleep_identity');
    }
  };

  // 4. 按下睡覺
  const handleSleepNow = async () => {
    if (!user) { alert("系統連線中，請稍後..."); return; }
    if (!identity) { alert("請先選擇你是誰！"); return; }
    
    const now = new Date();
    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        timestamp: now.getTime(),
        dateString: now.toLocaleDateString('zh-TW'),
        timeString: now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        userId: user.uid,
        userName: identity // 這裡會把「老公」或「老婆」存進去
      });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (error) {
      console.error("寫入錯誤:", error);
      alert("記錄失敗！請檢查：\n1. Firebase Authentication 的匿名登入是否已開啟？\n2. Firestore Rules 是否允許寫入？");
    }
  };

  const handleDelete = async (id) => {
    if(confirm('確定要刪除這條紀錄嗎？')) {
        try { await deleteDoc(doc(db, COLLECTION_NAME, id)); } 
        catch (e) { console.error(e); }
    }
  };

  // 分組顯示邏輯
  const groupedLogs = useMemo(() => {
    const groups = {};
    logs.forEach(log => {
      if (!groups[log.dateString]) groups[log.dateString] = [];
      groups[log.dateString].push(log);
    });
    return groups;
  }, [logs]);

  // --- 如果還沒選身分，顯示選擇畫面 ---
  if (!identity) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200">
        <h1 className="text-2xl font-bold mb-8 flex items-center gap-2"><User /> 請問你是？</h1>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button onClick={() => handleSetIdentity('老婆')} className="p-6 bg-pink-600/20 border-2 border-pink-500 rounded-xl hover:bg-pink-600/40 transition-all flex items-center justify-center gap-3 text-xl font-bold text-pink-200">
            👩 老婆
          </button>
          <button onClick={() => handleSetIdentity('老公')} className="p-6 bg-blue-600/20 border-2 border-blue-500 rounded-xl hover:bg-blue-600/40 transition-all flex items-center justify-center gap-3 text-xl font-bold text-blue-200">
             👨 老公
          </button>
        </div>
        <p className="mt-8 text-slate-500 text-sm">選一次之後就會記住囉！</p>
      </div>
    );
  }

  // --- 主畫面 ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* 頂部列 */}
      <header className="p-4 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2 text-indigo-300 font-medium">
            <BedDouble className="w-5 h-5" /> 晚安紀錄
        </div>
        <button onClick={handleResetIdentity} className="text-xs text-slate-500 flex items-center gap-1 bg-slate-800 px-2 py-1 rounded hover:text-white">
            <Settings className="w-3 h-3"/> {identity}
        </button>
      </header>

      <main className="flex-grow flex flex-col items-center p-6 max-w-md mx-auto w-full">
        {/* 大按鈕 */}
        <div className="flex-1 flex flex-col justify-center items-center w-full py-8">
            <h2 className="text-slate-400 mb-6 text-lg">嗨，<span className={identity === '老婆' ? 'text-pink-400' : 'text-blue-400'}>{identity}</span> 準備睡了嗎？</h2>
          <button
            onClick={handleSleepNow}
            className={`
              relative w-48 h-48 rounded-full flex flex-col items-center justify-center
              bg-gradient-to-b from-slate-800 to-slate-950
              border-4 border-slate-700 shadow-2xl transition-all duration-300
              active:scale-95 hover:scale-105 hover:border-indigo-500/50
              ${justAdded ? 'ring-4 ring-indigo-400 border-indigo-500' : ''}
            `}
          >
            {justAdded ? (
              <><Star className="w-16 h-16 text-yellow-300 animate-pulse mb-2" /><span className="text-white font-bold text-xl">晚安！</span></>
            ) : (
              <><Moon className="w-16 h-16 text-indigo-300 mb-2" /><span className="text-indigo-200 text-lg tracking-widest">我要睡了</span></>
            )}
          </button>
        </div>

        {/* 紀錄列表 */}
        <div className="w-full bg-slate-900/40 rounded-2xl p-4 border border-slate-800/60 min-h-[200px]">
          <div className="flex items-center gap-2 mb-4 text-slate-400 border-b border-slate-800 pb-2">
            <Clock className="w-4 h-4" /><h2 className="text-sm font-bold uppercase tracking-wider">最近紀錄</h2>
          </div>

          {loading ? <div className="text-center py-6 text-slate-600">載入中...</div> : 
           logs.length === 0 ? <div className="text-center py-6 text-slate-600 text-sm">還沒有紀錄</div> : (
            <div className="space-y-4 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {Object.keys(groupedLogs).map(date => (
                <div key={date}>
                  <div className="text-xs text-slate-500 mb-2 flex items-center gap-1 bg-slate-800/50 py-1 px-2 rounded-md w-fit mx-auto">
                    <Calendar className="w-3 h-3" />{date}
                  </div>
                  <div className="space-y-2">
                    {groupedLogs[date].map(log => (
                      <div key={log.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-slate-700/30">
                        <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-1 rounded font-bold ${log.userName === '老婆' ? 'bg-pink-900/30 text-pink-300' : log.userName === '老公' ? 'bg-blue-900/30 text-blue-300' : 'bg-gray-800 text-gray-400'}`}>
                                {log.userName || '未知'}
                            </span>
                            <span className="text-xl font-mono text-slate-200">{log.timeString}</span>
                        </div>
                        <button onClick={() => handleDelete(log.id)} className="text-slate-600 hover:text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }`}</style>
    </div>
  );
}