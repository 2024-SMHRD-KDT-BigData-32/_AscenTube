// src/api/favoriteChannelApi.jsx
import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:8082/AscenTube',
});

apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

export const fetchFavoriteChannels = async (googleId) => {
    try {
        const response = await apiClient.get('/fav-channel', { params: { googleId } });
        return response.data;
    } catch (error) {
        console.error("관심 채널 목록 조회 실패:", error);
        throw error;
    }
};

export const searchChannels = async (googleId, keyword) => {
    if (!keyword.trim()) return [];
    try {
        const response = await apiClient.get('/fav-channel/search', { params: { googleId, keyword } });
        return response.data;
    } catch (error) {
        console.error("채널 검색 실패:", error);
        throw error;
    }
};

/**
 * 새로운 관심 채널을 추가합니다. (POST /fav-channel/add)
 */
// googleId를 Query Parameter와 Body에 모두 포함하도록 (FavoriteChannels.jsx의 hardcodedChannelData에도 googleId가 있어야 함)
export const addFavoriteChannel = async (googleId, channelData) => { 
    try {
        const response = await apiClient.post('/fav-channel/add', channelData, { params: { googleId } });
        return response.data;
    } catch (error) {
        console.error("관심 채널 추가 실패:", error);
        throw error;
    }
};

export const updateFavoriteChannel = async (favId, memoData) => {
    try {
        const response = await apiClient.put(`/fav-channel/${favId}`, memoData);
        return response.data;
    } catch (error) {
        console.error("관심 채널 수정 실패:", error);
        throw error;
    }
};

export const deleteFavoriteChannel = async (favId) => {
    try {
        await apiClient.delete(`/fav-channel/${favId}`);
    } catch (error) {
        console.error("관심 채널 삭제 실패:", error);
        throw error;
    }
};