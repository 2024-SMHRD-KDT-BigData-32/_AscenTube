import React, { useEffect, useState, useMemo } from 'react';
import '../styles/pages/Interest.css';
// 'Line' is not used, so we remove it.
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// =============================================================
// Helper Functions (데이터 처리 함수)
// =============================================================
function parseDuration(str) {
  if (!str || typeof str !== 'string') return 0;
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function getSummaryStats(videos) {
  if (!videos || videos.length === 0) return {};

  const views = videos.map(v => v.views || 0);
  const likes = videos.map(v => v.likes || 0);
  const comments = videos.map(v => v.commentsCount || 0);
  const durations = videos.map(v => parseDuration(v.duration));
  const videoCount = videos.length || 1;

  return {
    maxView: videos[views.indexOf(Math.max(...views))],
    minView: videos[views.indexOf(Math.min(...views))],
    maxDuration: videos[durations.indexOf(Math.max(...durations))],
    minDuration: videos[durations.indexOf(Math.min(...durations))],
    maxLike: videos[likes.indexOf(Math.max(...likes))],
    maxComment: videos[comments.indexOf(Math.max(...comments))],
    avgView: Math.round(views.reduce((a, b) => a + b, 0) / videoCount),
  };
}

// =============================================================
// Sub-Components (UI 컴포넌트)
// =============================================================

function UrlEditModal({ open, mode, url, memo, onChangeUrl, onChangeMemo, onConfirm, onClose }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.21)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose} >
      <div style={{ background: "#fff", borderRadius: "1rem", padding: "2rem 1.5rem", minWidth: 320, boxShadow: "0 10px 32px rgba(0,0,0,0.16)", display: "flex", flexDirection: "column", gap: "1.1rem" }} onClick={e => e.stopPropagation()} >
        <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1.14rem", color: "#374151" }}> {mode === "add" ? "채널 추가" : "채널 URL 수정"} </h3>
        <input type="text" value={url} autoFocus onChange={e => onChangeUrl(e.target.value)} style={{ width: "100%", fontSize: "1.08rem", borderRadius: "0.5rem", border: "1.5px solid #2563eb", padding: "0.55em 1em" }} onKeyDown={e => { if (e.key === "Enter") onConfirm(); if (e.key === "Escape") onClose(); }} placeholder="유튜브 채널 URL" />
        {mode === "add" && (<input type="text" value={memo} onChange={e => onChangeMemo(e.target.value)} style={{ width: "100%", fontSize: "1.01rem", borderRadius: "0.5rem", border: "1px solid #c7d2fe", padding: "0.48em 0.9em" }} placeholder="메모 (선택)" />)}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={{ flex: 1, padding: "0.6em", borderRadius: "0.5rem", border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" }} onClick={onConfirm} > {mode === "add" ? "등록" : "저장"} </button>
          <button style={{ flex: 1, padding: "0.6em", borderRadius: "0.5rem", border: "none", background: "#eee", color: "#444", fontWeight: 500, cursor: "pointer" }} onClick={onClose} > 취소 </button>
        </div>
      </div>
    </div>
  );
}

function ChannelSelector({ channels, selected, onSelect, onRemove, onAdd, onEditUrl }) {
  const [modal, setModal] = useState({ open: false, mode: "add", idx: null, url: "", memo: "" });
  const openAddModal = () => setModal({ open: true, mode: "add", idx: null, url: "", memo: "" });
  const openEditModal = (idx) => setModal({ open: true, mode: "edit", idx, url: channels[idx]?.url || "", memo: "" });
  const handleConfirm = () => {
    if (modal.mode === "add") {
      if (modal.url.trim()) { onAdd({ url: modal.url.trim(), memo: modal.memo.trim() }); setModal({ ...modal, open: false }); }
    } else if (modal.mode === "edit") {
      if (modal.url.trim()) { onEditUrl(modal.idx, modal.url.trim()); setModal({ ...modal, open: false }); }
    }
  };
  return (
    <>
      <div className="channel-selector">
        {channels.map((ch, idx) => (
          <div key={ch.name || idx} className={`channel-item${selected?.name === ch.name ? " selected" : ""}`} onClick={() => onSelect(ch)} onDoubleClick={e => { e.stopPropagation(); openEditModal(idx); }} >
            <img src={ch.profile || "https://yt3.ggpht.com/ytc/AKedOLQ1h4eS8_zfA8z81B33iKYZCB6ZJ15w1ttbyM7I=s88-c-k-c0x00ffffff-no-rj"} alt={ch.name} className="channel-thumb" />
            <span className="channel-name">{ch.name}</span>
            {channels.length > 1 && (<button className="channel-remove" onClick={e => { e.stopPropagation(); onRemove(idx); }} title="삭제" >×</button>)}
          </div>
        ))}
        <button className="channel-add-btn" onClick={openAddModal} title="채널 추가">＋</button>
      </div>
      <UrlEditModal open={modal.open} mode={modal.mode} url={modal.url} memo={modal.memo} onChangeUrl={val => setModal(m => ({ ...m, url: val }))} onChangeMemo={val => setModal(m => ({ ...m, memo: val }))} onConfirm={handleConfirm} onClose={() => setModal(m => ({ ...m, open: false }))} />
    </>
  );
}

function ChannelIntro({ channel }) {
    if (!channel) return null;
    const channelUrl = channel.url || `https://www.youtube.com/results?search_query=$${encodeURIComponent(channel.name)}`;
    return (
        <div className="channel-intro-box">
            <img src={channel.profile} alt={channel.name} className="channel-intro-img" />
            <div className="channel-intro-meta">
                <div className="channel-intro-title">
                    <h2>{channel.name}</h2>
                    <a href={channelUrl} className="channel-link-btn" target="_blank" rel="noopener noreferrer"> 채널 바로가기 </a>
                </div>
                <div className="channel-intro-desc">{channel.desc}</div>
            </div>
        </div>
    );
}

// ✅ StatCard 컴포넌트 정의 추가
function StatCard({ title, value, highlight }) {
  return (
    <div className={`card${highlight ? ' highlight' : ''}`}>
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}

function VideoTable({ title, videos = [] }) {
  // ✅ 미사용 변수(setSortKey, setSortDir) 제거
  const [sortKey] = useState("date");
  const [sortDir] = useState("desc");

  const sortedVideos = useMemo(() => {
    const newSorted = [...videos];
    newSorted.sort((a, b) => {
      if (sortKey === "date") {
        return (b.date || "").localeCompare(a.date || "");
      }
      if (sortKey === "views") {
        return (b.views || 0) - (a.views || 0);
      }
      if (sortKey === "duration") {
        return parseDuration(b.duration) - parseDuration(a.duration);
      }
      return 0;
    });
    if (sortDir === "asc") {
      newSorted.reverse();
    }
    return newSorted;
  }, [videos, sortKey, sortDir]);

  return (
    <section className="contents-section">
      <div className="video-table-controls" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {/* (정렬 컨트롤 UI 생략) */}
      </div>
      <div className="video-table-wrapper">
        <table className="video-table">
          <thead>
            <tr><th>제목</th><th>게시일</th><th>영상 길이</th><th>조회수</th></tr>
          </thead>
          <tbody>
            {sortedVideos.map((v, i) => (
              <tr key={v.url || i}>
                <td><a href={v.url} target="_blank" rel="noopener noreferrer" className="video-link">{v.title}</a></td>
                <td>{v.date}</td>
                <td>{v.duration}</td>
                <td>{v.views?.toLocaleString() || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


// =============================================================
// Main Component
// =============================================================
const Interest = () => {
  const [channelList, setChannelList] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  // ✅ 미사용 변수(setLoading) 제거
  const [loading] = useState(false); 

  useEffect(() => {
    // 예: fetchChannels().then(data => setChannelList(data));
  }, []);

  const handleAddChannel = async ({ url, memo }) => {
    const nameMatch = url.match(/@([^/?]+)/);
    const name = nameMatch ? nameMatch[1] : `채널${channelList.length + 1}`;
    const newChannel = {
      name,
      desc: memo,
      profile: "https://yt3.ggpht.com/ytc/AKedOLQ1h4eS8_zfA8z81B33iKYZCB6ZJ15w1ttbyM7I=s88-c-k-c0x00ffffff-no-rj",
      url,
      stats: {}, normalVideos: [], shorts: []
    };
    setChannelList(prev => [...prev, newChannel]);
    setSelectedChannel(newChannel);
  };

  const handleRemoveChannel = (idx) => {
    if (channelList.length === 1) return;
    const removedChannel = channelList[idx];
    const newList = channelList.filter((_, i) => i !== idx);
    setChannelList(newList);
    if (selectedChannel === removedChannel) {
        setSelectedChannel(newList[0] || null);
    }
  };

  const handleEditUrl = (idx, newUrl) => {
    const newList = [...channelList];
    newList[idx] = { ...newList[idx], url: newUrl };
    setChannelList(newList);
  };
  
  const { stats = {}, normalVideos = [], shorts = [] } = selectedChannel || {};
  const normalSummary = getSummaryStats(normalVideos);

  if (loading) {
    return <p className="loading-text">📡 채널 데이터 불러오는 중...</p>;
  }

  return (
    <div className="interest-container">
      <header className="interest-header">
        <h1>관심 채널 분석</h1>
      </header>
      <main className="interest-main">
        <ChannelSelector
          channels={channelList}
          selected={selectedChannel}
          onSelect={setSelectedChannel}
          onAdd={handleAddChannel}
          onEditUrl={handleEditUrl}
          onRemove={handleRemoveChannel}
        />
        
        {selectedChannel ? (
          <>
            <ChannelIntro channel={selectedChannel} />
            <div className="card-grid">
              <StatCard title="총 조회수" value={Number(stats.viewCount || 0).toLocaleString()} highlight />
              <StatCard title="구독자 수" value={Number(stats.subscriberCount || 0).toLocaleString() + "명"} />
              <StatCard title="영상 평균 조회수" value={normalSummary.avgView?.toLocaleString() || "-"} />
            </div>
            <VideoTable title="일반 동영상" videos={normalVideos} />
            <VideoTable title="YouTube 숏폼" videos={shorts} />
          </>
        ) : (
          <div className="empty-channel-guide">
            <p>분석할 채널을 추가하거나 선택해주세요.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Interest;