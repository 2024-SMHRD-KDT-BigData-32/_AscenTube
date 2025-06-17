import React from 'react';
import WordCloud from 'react-wordcloud';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';
// import 'react-wordcloud/dist/index.css'; ← 필요 없다면 주석 유지

const options = {
    rotations: 1,
    rotationAngles: [0, 0],
    fontSizes: [30, 80],
    padding: 5,
    shrinkToFit: true,
};

const WordCloudBox = ({ words }) => {
    const processedWords = React.useMemo(() => {
        const sorted = [...words]
        .sort((a, b) => b.value - a.value)
        .slice(0, 25); // 상위 15개 단어
        const [centerWord, ...rest] = sorted;
        return [centerWord, ...rest]; // 중심에 오도록 유도
    }, [words]);

    return (
        <div style={{ width: '100%', height: '300px' }}>
        <h2 style={{ textAlign: 'center' }}></h2>
        <WordCloud words={processedWords} options={options} />
        </div>
    );
};

export default WordCloudBox;
