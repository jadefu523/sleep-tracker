import React, { useState, useEffect, useMemo } from 'react';
import { Moon, Clock, Calendar, Trash2, BedDouble, Star, AlertTriangle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

// ▼▼▼▼▼▼▼▼▼▼ 你的專屬設定 (已更新) ▼▼▼▼▼▼▼▼▼▼
const firebaseConfig = {
  apiKey: "AIzaSyCt5qobh-bCz_2jBzM1n4YjjLfar86zdQQ",
  authDomain: "sleep-tracker-d4203.firebaseapp.com",
  projectId: "sleep-tracker-d4203",
  storageBucket: "sleep-tracker-d4203.firebasestorage.app",
  messagingSenderId: "263830928526",
  appId: "1:263830928526:web:ca4f797bef53737d3d1ddf",
  measurementId: "G-4SDQW92J4B"
};
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 資料庫集合名稱
const COLLECTION_NAME = 'sleep_logs';

export default function App() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [justAdded, setJustAdded] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // 1. 自動匿名登入
  useEffect(() => {
    signInAnonymously(auth).catch((error) => console.error("登入錯誤:", error));
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. 監聽資料庫變化 (即時同步)
  useEffect(() => {
    // 簡單模式：直接抓取整個 sleep_logs 集合
    const logsCollection = collection(db, COLLECTION_NAME);

    const unsubscribe = onSnapshot(
      logsCollection,
      (snapshot) => {
        const fetchedLogs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // 在這裡做排序 (新的在上面)
        fetchedLogs.sort((a, b) => b.timestamp - a.timestamp);
        setLogs(fetchedLogs);
        setLoading(false);
      },
      (error) => {
        console.error("讀取資料錯誤:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 3. 按下睡覺按鈕
  const handleSleepNow = async () => {
    if (!user) {
        // 如果還沒登入成功，先不給按
        return;
    }
    const now = new Date();
    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        timestamp: now.getTime(),
        dateString: now.toLocaleDateString('zh-TW'),
        timeString: now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        userId: user.uid
      });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (error) {
      console.error("寫入錯誤:", error);
      alert("記錄失敗，請檢查 Firebase 是否開啟 Firestore 與匿名登入");
    }
  };

  // 4. 刪除功能
  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("刪除錯誤:", error);
    }
  };

  // 5. 資料分組顯示
  const groupedLogs = useMemo(() => {
    const groups = {};
    logs.forEach(log => {
      if (!groups[log.dateString]) groups[log.dateString] = [];
      groups[log.dateString].push(log);
    });
    return groups;
  }, [logs]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* 刪除確認視窗 */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="text-amber-500 w-5 h-5"/> 確認刪除？
            </h3>
            <p className="text-slate-400 mb-6">這條紀錄將會消失喔。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300">取消</button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white flex items-center gap-2"><Trash2 className="w-4 h-4" />刪除</button>
            </div>
          </div>
        </div>
      )}

      <header className="p-6 text-center border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10">
        <h1 className="text-xl font-medium tracking-wide flex items-center justify-center gap-2 text-indigo-300">
          <BedDouble className="w-6 h-6" /> 晚安紀錄
        </h1>
      </header>

      <main className="flex-grow flex flex-col items-center p-6 max-w-md mx-auto w-full">
        {/* 按鈕區域 */}
        <div className="flex-1 flex flex-col justify-center items-center w-full py-10">
          <button
            onClick={handleSleepNow}
            className={`
              relative w-48 h-48 rounded-full flex flex-col items-center justify-center
              bg-gradient-to-b from-indigo-600 to-slate-900
              border-4 border-slate-700 shadow-2xl transition-all duration-300
              active:scale-95 hover:scale-105
              ${justAdded ? 'ring-4 ring-indigo-400' : ''}
            `}
          >
            {justAdded ? (
              <><Star className="w-16 h-16 text-yellow-200 animate-pulse mb-2" /><span className="text-indigo-100 font-bold">晚安！</span></>
            ) : (
              <><Moon className="w-16 h-16 text-indigo-200 mb-2" /><span className="text-indigo-200">我要睡了</span></>
            )}
          </button>
        </div>

        {/* 列表區域 */}
        <div className="w-full bg-slate-900/50 rounded-2xl p-5 border border-slate-800 shadow-inner min-h-[200px]">
          <div className="flex items-center gap-2 mb-4 text-slate-400 border-b border-slate-800 pb-2">
            <Clock className="w-4 h-4" /><h2 className="text-sm font-semibold">最近紀錄</h2>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-600">讀取中...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-slate-600 italic text-sm">還沒有紀錄，今晚開始吧！</div>
          ) : (
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {Object.keys(groupedLogs).map(date => (
                <div key={date}>
                  <div className="text-xs text-indigo-400 mb-2 flex items-center gap-1 bg-slate-800/50 py-1 px-2 rounded w-fit">
                    <Calendar className="w-3 h-3" />{date}
                  </div>
                  <div className="space-y-2">
                    {groupedLogs[date].map(log => (
                      <div key={log.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700/50">
                        <span className="text-xl font-mono text-slate-200 ml-2">{log.timeString}</span>
                        <button onClick={() => setDeleteId(log.id)} className="text-slate-600 hover:text-red-400 p-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* 樣式修正 */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.5); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.3); border-radius: 4px; }
      `}</style>
    </div>
  );
}