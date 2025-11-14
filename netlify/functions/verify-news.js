// netlify/functions/verify-news.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    console.log('verify-news函数被调用，请求方法:', event.httpMethod);
    
    // 处理CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        console.log('收到非POST请求:', event.httpMethod);
        return { 
            statusCode: 405, 
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }) 
        };
    }

    try {
        const { content, source } = JSON.parse(event.body);
        console.log('收到验证请求，内容长度:', content ? content.length : 0);
        console.log('信息来源:', source);
        
        if (!content) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Content is required' })
            };
        }

        // 使用和grade-essay.js相同的环境变量名
        const API_KEY = process.env.QIANFAN_API_KEY;
        const APP_ID = process.env.QIANFAN_APP_ID;
        
        console.log('API_KEY 存在:', !!API_KEY);
        console.log('APP_ID 存在:', !!APP_ID);
        
        if (!API_KEY || !APP_ID) {
            console.error('环境变量缺失:', { hasApiKey: !!API_KEY, hasAppId: !!APP_ID });
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Server configuration error',
                    details: {
                        hasApiKey: !!API_KEY,
                        hasAppId: !!APP_ID
                    }
                })
            };
        }

        const prompt = `You are a professional fake news verification expert. Please analyze the following information using the SIFT four-step verification method:

Information: "${content}"
Source: "${source}"

Please respond in English with JSON format containing these fields:
- sift_analysis: {stop, investigate_source, find_coverage, trace_claims}
- credibility_rating: string
- final_advice: string  
- learning_tips: string

Make the analysis detailed and educational.`;

        const requestBody = {
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 2000
        };

        console.log('准备调用千帆API...');
        
        // 使用和grade-essay.js完全相同的API调用方式
        const response = await fetch('https://qianfan.baidubce.com/v2/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': API_KEY,  // 直接使用API_KEY，不加Bearer
                'appid': APP_ID
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('千帆API响应状态:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('千帆API错误详情:', {
                status: response.status,
                statusText: response.statusText,
                errorText: errorText
            });
            throw new Error(`API error: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('千帆API成功响应');
        
        // 解析AI回复
        let aiResponse;
        try {
            const aiContent = data.choices[0].message.content;
            console.log('AI回复内容:', aiContent);
            
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                aiResponse = JSON.parse(jsonMatch[0]);
            } else {
                aiResponse = createDefaultResponse(aiContent, source);
            }
        } catch (parseError) {
            console.error('解析AI回复失败:', parseError);
            aiResponse = createDefaultResponse(data.choices[0].message.content, source);
        }

        aiResponse.content = content;
        aiResponse.source = source;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(aiResponse)
        };
        
    } catch (error) {
        console.error('函数执行错误:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: `Processing error: ${error.message}`,
                stack: error.stack
            })
        };
    }
};

function createDefaultResponse(aiContent, source) {
    return {
        sift_analysis: {
            stop: "Based on AI analysis, this information contains multiple elements that require verification.",
            investigate_source: `The credibility of "${source}" needs further investigation.`,
            find_coverage: "Search for relevant reports through authoritative news media.",
            trace_claims: "Track the original source to check for modifications."
        },
        credibility_rating: "Needs Caution",
        final_advice: "Verify through multiple reliable channels before sharing.",
        learning_tips: "Always stop and verify suspicious information from multiple sources."
    };
}
