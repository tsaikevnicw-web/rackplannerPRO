import { useRackPlanner } from '../context/RackPlannerContext';
import { getServerCategory } from '../utils/helpers';

export function useRackInteractions() {
    const { devices, setDevices, generateId, showAlert } = useRackPlanner();

    const handleDragStart = (e, dev, isClone = false) => {
        let draggingDevice = { ...dev };
        if (!isClone) draggingDevice.customName = dev.customName || dev.name;
        e.dataTransfer.setData('device', JSON.stringify(draggingDevice));
        e.dataTransfer.setData('isClone', isClone);
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    const handleDrop = (e, targetU, rackId, rackMaxU = 48) => {
        e.preventDefault();
        try {
            const deviceData = JSON.parse(e.dataTransfer.getData('device'));
            const isClone = e.dataTransfer.getData('isClone') === 'true';

            if (deviceData.type === 'SideCDU') {
                const existingSideCDU = devices.find(d => d.rackId === rackId && d.type === 'SideCDU' && d.id !== deviceData.id);
                if (existingSideCDU) {
                    showAlert('一個機櫃最多只能掛載一台 SideCar CDU！', '錯誤', 'error');
                    return;
                }
                if (!deviceData.id || isClone) {
                    const newDev = { ...deviceData, id: generateId(), rackId, startU: 1, connections: {} };
                    setDevices(prev => [...prev, newDev]);
                } else {
                    setDevices(prev => prev.map(dev => dev.id === deviceData.id ? { ...dev, rackId, startU: 1 } : dev));
                }
                return;
            }

            const deviceSize = deviceData.size;
            if (targetU + deviceSize - 1 > rackMaxU) {
                showAlert('設備超出機櫃空間！', '錯誤', 'error');
                return;
            }

            const isOverlap = devices.some(dev => {
                if (dev.rackId !== rackId) return false;
                if (dev.id === deviceData.id && !isClone) return false;
                if (dev.type === 'SideCDU') return false; 
                return !(targetU + deviceSize - 1 < dev.startU || targetU > dev.startU + dev.size - 1);
            });

            if (isOverlap) {
                showAlert('該位置已有其他設備！', '錯誤', 'error');
                return;
            }

            if (!deviceData.id || isClone) {
                const newDev = { ...deviceData, id: generateId(), rackId, startU: targetU, connections: {} };
                setDevices(prev => [...prev, newDev]);
            } else {
                setDevices(prev => prev.map(dev => dev.id === deviceData.id ? { ...dev, rackId, startU: targetU } : dev));
            }

            // 重心安全提示：AI 伺服器放置在 30U 以上時彈出警告
            const isAIServer = deviceData.type === 'ServerAI' || deviceData.type === 'Server5U' || getServerCategory(deviceData) === 'AI';
            if (isAIServer && targetU >= 30) {
                showAlert(
                    `【安全警告】您將 AI 伺服器 (${deviceData.customName || deviceData.name}) 放置於第 ${targetU}U (30U 以上)。\nAI 伺服器重量極重，不建議放置於機櫃高位，以防造成機櫃重心過高、產生傾倒與工安危險！`,
                    '機櫃重心安全警告',
                    'warning'
                );
            }
        } catch (error) {
            console.error('Drop error:', error);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    return { handleDragStart, handleDrop, handleDragOver };
}
