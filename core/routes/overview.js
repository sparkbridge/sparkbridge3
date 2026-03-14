const express = require('express');
const jwt = require('jsonwebtoken');

const si = require('systeminformation');
const os = require('os');
const net = require('net');
const process = require('process');

/**
 * 获取系统核心信息（对应截图中所有字段）
 */
async function getSystemInfo() {
    try {
        // 1. CPU 实时占用率
        const cpuLoad = await si.currentLoad();
        const cpuUsage = Math.round(cpuLoad.currentLoad); // 取整，如 25%

        // 2. 内存实时占用率
        const memInfo = await si.mem();
        const memUsage = Math.round((memInfo.used / memInfo.total) * 100); // 如 65%

        // 3. 运行环境信息
        const nodeVersion = process.version.replace('v', ''); // Node.js 版本（如 v20.11.0）
        const osInfo = await si.osInfo();
        const osVersion = `${osInfo.platform} ${osInfo.release}`; // 如 Windows 10.0.20348
        const pid = process.pid; // 进程 ID（如 12840）
        const arch = os.arch(); // 运行架构（如 x64）

        // 4. 内网 IP 地址（取非本地回环的第一个内网 IP）
        const networkInterfaces = os.networkInterfaces();
        let innerIp = '未知';
        for (const interfaceName of Object.keys(networkInterfaces)) {
            const addresses = networkInterfaces[interfaceName];
            for (const addr of addresses) {
                // 过滤 IPv4、非回环地址、非虚拟网卡
                if (addr.family === 'IPv4' && !addr.internal && !interfaceName.includes('Virtual')) {
                    innerIp = addr.address; // 如 192.168.1.15
                    break;
                }
            }
            if (innerIp !== '未知') break;
        }

        // 5. 服务端口（示例：假设你的服务监听 3001 端口，可动态检测）
        const serverPort = 3001; // 若需动态获取，可遍历当前进程监听端口（见下方扩展）

        // 6. 连接协议（固定/根据服务类型定义）
        const protocol = 'WebSocket / HTTP';

        // 7. 心跳状态（模拟：检测服务是否正常，返回延迟）
        const heartbeatStatus = "正常(2s)" // await checkHeartbeat(); // 如 

        // 整合所有信息
        return {
            // 资源占用
            cpuUsage: `${cpuUsage}%`,
            memUsage: `${memUsage}%`,
            // 运行环境
            nodeVersion,
            osVersion,
            pid,
            arch,
            // 连接与地址
            innerIp,
            serverPort,
            protocol,
            heartbeatStatus
        };
    } catch (error) {
        console.error('获取系统信息失败：', error);
        return null;
    }
}

/**
 * 模拟/检测服务心跳（可替换为实际服务的心跳检测逻辑）
 * @returns {string} 心跳状态（如 "正常(2s)"）
 */
async function checkHeartbeat() {
    try {
        const startTime = Date.now();
        // 模拟心跳检测（如请求本地服务接口）
        await new Promise(resolve => setTimeout(resolve, 200)); // 模拟 200ms 延迟
        const delay = Math.round((Date.now() - startTime) / 1000); // 取秒级
        return `正常(${delay}s)`;
    } catch (error) {
        return '异常';
    }
}

/**
 * 扩展：动态获取当前 Node.js 进程监听的端口（可选）
 * @returns {number[]} 监听的端口列表
 */
async function getListeningPorts() {
    const connections = await si.networkConnections();
    const pid = process.pid;
    const ports = connections
        .filter(conn => conn.pid === pid && conn.state === 'LISTEN')
        .map(conn => conn.localPort)
        .filter((port, index, self) => self.indexOf(port) === index); // 去重
    return ports;
}

let name = null;

module.exports = (webManager) => {
    const router = express.Router();
    
    router.get('/', webManager.requireAuth, (req, res) => {
        if(!name){
            spark.QClient.getLoginInfo().then(info=>{
                name = info.nickname;
            })
            spark.QClient.getModelShow().then(info=>{
                // console.log(info)
            })
        }
        getSystemInfo().then(data => {
            res.json({
                code: 200,
                data:{
                    qbot:{
                        qid:spark.env.get("qid"),
                        nickname:name,
                        version:spark.env.get("version")
                    },
                    runtime:{
                        os:data.osVersion,
                        nodev:data.nodeVersion,
                        pid:data.pid,
                        arch:data.arch
                    },
                    usage:{
                        cpu:data.cpuUsage,
                        mem:data.memUsage
                    },
                    network:{
                        ip:data.innerIp,
                        port:data.serverPort,
                        protocol:data.protocol,
                        heartbeat:data.heartbeatStatus
                    },

                }
            })
        });
        
    });

    return router;
};
