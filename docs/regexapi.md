```js
spark.on('core.ready', () => {
    const registerRegexAction = spark.env.get('regex.register_action');

    if (registerRegexAction) {
        registerRegexAction('getWeather', async (params, pack, context) => {
            // params 此时已经经过了解析
            
            // 假设我们调用了 API 获取数据
            const apiResponse = {
                loc: "美国",
                status: "晴天",
                temp: "25°C"
            };
            
            // 直接返回一个键值对对象！
            return {
                location: apiResponse.loc,
                weather: apiResponse.status,
                temperature: apiResponse.temp
            };
        });
    }
});
```