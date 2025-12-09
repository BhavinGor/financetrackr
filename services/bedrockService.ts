import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { Transaction } from "../types";

const REGION = import.meta.env.VITE_AWS_REGION || "us-east-1";
const MODEL_ID = "us.amazon.nova-pro-v1:0"; // Amazon Nova Pro

// Decoded from BEDROCK_API_KEY if present
// Format: AccessKey:SecretKey
const getCredentials = () => {
    console.log("🔧 Attempting to load AWS Credentials...");
    console.log("📋 Available env vars:", {
        hasAccessKey: !!import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        hasSecretKey: !!import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
        hasBedrockKey: !!import.meta.env.VITE_BEDROCK_API_KEY,
        accessKeyPrefix: import.meta.env.VITE_AWS_ACCESS_KEY_ID?.substring(0, 10),
        region: import.meta.env.VITE_AWS_REGION
    });

    if (import.meta.env.VITE_AWS_ACCESS_KEY_ID && import.meta.env.VITE_AWS_SECRET_ACCESS_KEY) {
        console.log("✅ Found standard AWS Env Vars");
        const creds = {
            accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
            secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
        };
        console.log("✅ Credentials loaded successfully");
        return creds;
    }

    if (import.meta.env.VITE_BEDROCK_API_KEY) {
        console.log("Found BEDROCK_API_KEY, attempting decode...");
        try {
            const decoded = atob(import.meta.env.VITE_BEDROCK_API_KEY);
            const [accessKeyId, secretAccessKey] = decoded.split(':');
            if (accessKeyId && secretAccessKey) {
                console.log("Successfully decoded BEDROCK_API_KEY");
                return { accessKeyId, secretAccessKey };
            }
        } catch (e) {
            console.error("Failed to decode BEDROCK_API_KEY", e);
        }
    }
    console.error("❌ No valid AWS credentials found!");
    return undefined;
};

const client = new BedrockRuntimeClient({
    region: REGION,
    credentials: getCredentials()
});

export const getFinancialInsights = async (transactions: Transaction[], balance: number): Promise<string> => {
    // Prepare a summary string of the last 15 transactions
    const recentTx = transactions.slice(0, 15).map(t =>
        `${t.date}: ${t.type} - ${t.category} (₹${t.amount}) - ${t.description}`
    ).join('\n');

    const userMessage = `You are a financial advisor for the "FinanceTrackr" app tailored for an Indian user context.
Current Total Balance: ₹${balance}

Here are the recent transactions:
${recentTx}

Please provide a concise, 3-point financial insight or advice summary based on this data.
Focus on spending habits, potential savings, or budget alerts.
Keep the tone professional yet encouraging.
Format as a markdown list.`;

    // Nova Pro uses Messages API format
    const payload = {
        messages: [
            {
                role: "user",
                content: [{ text: userMessage }]
            }
        ],
        inferenceConfig: {
            max_new_tokens: 500,
            temperature: 0.7
        }
    };

    try {
        console.log("🤖 Calling Nova Pro for financial insights...");
        const command = new InvokeModelCommand({
            modelId: MODEL_ID,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload),
        });

        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        console.log("✅ Nova Pro response received");
        // Nova Pro response format
        return responseBody.output.message.content[0].text || "No insights generated.";
    } catch (error) {
        console.error("Error generating financial insights with Bedrock:", error);
        return "Unable to generate insights at this moment. Please check your AWS credentials.";
    }
}


export const parseTransactionFromEmail = async (emailContent: string): Promise<Partial<Transaction> | null> => {
    const userMessage = `You are an AI assistant that extracts financial transaction details from email text.
Extract the following fields if present:
- Amount (number)
- Date (YYYY-MM-DD)
- Merchant/Description (string)
- Category (one of: Food, Groceries, Rent, Transport, Fuel, Utilities, Shopping, Entertainment, Salary, Freelance, Vehicle Maint., Insurance, Savings, Other)
- Type (Income or Expense)

Email Content:
"${emailContent}"

Return ONLY a JSON object with keys: amount, date, description, category, type.
If no transaction found, return null.`;

    const payload = {
        messages: [
            {
                role: "user",
                content: [{ text: userMessage }]
            }
        ],
        inferenceConfig: {
            max_new_tokens: 300,
            temperature: 0
        }
    };

    try {
        const command = new InvokeModelCommand({
            modelId: MODEL_ID,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload),
        });

        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const completion = responseBody.output.message.content[0].text;

        // Extract JSON from completion
        const jsonMatch = completion.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (error) {
        console.error("Error parsing email with Bedrock:", error);
        return null;
    }
};

/**
 * Extract transactions from PDF bank statement text using AI
 * @param pdfText - Raw text extracted from PDF
 * @returns Structured transaction data
 */
const _validateResponseStructure = (responseBody: any): string => {
    console.log("🔍 [_validateResponseStructure] Validating response structure...");
    console.log("   Response body type:", typeof responseBody);
    console.log("   Response keys:", Object.keys(responseBody || {}));
    
    if (!responseBody) {
        console.error("   ❌ responseBody is null/undefined");
        throw new TypeError("Response body is null or undefined");
    }
    
    console.log("   output exists:", !!responseBody.output);
    console.log("   output.message exists:", !!responseBody.output?.message);
    console.log("   output.message.content exists:", !!responseBody.output?.message?.content);
    console.log("   output.message.content type:", typeof responseBody.output?.message?.content);
    
    if (!responseBody?.output?.message?.content) {
        console.error("   ❌ Missing output.message.content");
        throw new TypeError("Invalid AI response structure - missing content array");
    }
    
    const content = responseBody.output.message.content;
    console.log("   content is array:", Array.isArray(content));
    console.log("   content length:", content.length);
    
    if (!Array.isArray(content)) {
        console.error("   ❌ content is not an array");
        throw new TypeError("Invalid AI response structure - content is not an array");
    }
    
    if (content.length === 0) {
        console.error("   ❌ content array is empty");
        throw new Error("AI response content array is empty");
    }
    
    console.log("   Accessing content[0]...");
    const firstItem = content[0];
    console.log("   content[0] exists:", !!firstItem);
    console.log("   content[0] type:", typeof firstItem);
    console.log("   content[0] keys:", Object.keys(firstItem || {}));
    
    const aiResponse = firstItem?.text;
    console.log("   aiResponse exists:", !!aiResponse);
    console.log("   aiResponse length:", aiResponse?.length);
    
    if (!aiResponse || aiResponse.trim().length === 0) {
        console.error("   ❌ No response text found");
        throw new Error("No response text received from AI service");
    }
    
    console.log("   ✅ Validation passed");
    return aiResponse;
};

const _extractJsonFromResponse = (aiResponse: string): any => {
    console.log("🔍 [_extractJsonFromResponse] Extracting JSON from AI response...");
    console.log("   aiResponse length:", aiResponse.length);
    console.log("   First 100 chars:", aiResponse.substring(0, 100));
    console.log("   Last 100 chars:", aiResponse.substring(Math.max(0, aiResponse.length - 100)));
    
    console.log("   Looking for JSON pattern...");
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    console.log("   Match found:", !!jsonMatch);
    console.log("   Match length:", jsonMatch?.length);
    console.log("   Match[0] length:", jsonMatch?.[0]?.length);
    
    if (!jsonMatch || jsonMatch.length === 0) {
        console.error("   ❌ No JSON match found");
        throw new Error("Failed to parse AI response - no valid JSON found");
    }
    
    console.log("   Parsing JSON from match...");
    try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log("   ✅ JSON parsed successfully");
        console.log("   Keys:", Object.keys(parsed));
        return parsed;
    } catch (parseError: any) {
        console.error("   ❌ JSON parse error:", parseError.message);
        console.error("   Failed JSON string:", jsonMatch[0].substring(0, 200));
        throw new Error(`Failed to parse JSON: ${parseError.message}`);
    }
};

const _validateTransactionData = (extracted: any): void => {
    console.log("🔍 [_validateTransactionData] Validating transaction data...");
    console.log("   extracted type:", typeof extracted);
    console.log("   extracted keys:", Object.keys(extracted || {}));
    console.log("   extracted.transactions exists:", !!extracted?.transactions);
    
    if (!extracted) {
        console.error("   ❌ extracted object is null/undefined");
        throw new TypeError("Invalid response - extracted data is empty");
    }
    
    if (!extracted.transactions) {
        console.error("   ❌ Missing 'transactions' field");
        console.error("   Full extracted object:", JSON.stringify(extracted).substring(0, 500));
        throw new TypeError("Invalid response structure - missing 'transactions' field");
    }
    
    console.log("   transactions type:", typeof extracted.transactions);
    console.log("   Is array:", Array.isArray(extracted.transactions));
    
    if (!Array.isArray(extracted.transactions)) {
        console.error("   ❌ transactions is not an array");
        throw new TypeError("Invalid response structure - 'transactions' is not an array");
    }
    
    console.log("   transactions length:", extracted.transactions.length);
    
    if (extracted.transactions.length === 0) {
        console.error("   ❌ transactions array is empty");
        throw new Error("No transactions found in the PDF. The document may not be a bank statement or contains no transaction data.");
    }
    
    console.log("   ✅ Validation passed");
    console.log("   First transaction:", JSON.stringify(extracted.transactions[0]).substring(0, 200));
};

export const extractTransactionsFromPdf = async (pdfText: string): Promise<any> => {
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("📊 [extractTransactionsFromPdf] STARTING PDF TRANSACTION EXTRACTION");
    console.log("═══════════════════════════════════════════════════════════════");
    
    console.log("   Input validation...");
    console.log("   pdfText type:", typeof pdfText);
    console.log("   pdfText length:", pdfText?.length);
    
    if (!pdfText || pdfText.trim().length === 0) {
        console.error("   ❌ No text provided");
        throw new Error('No text available for extraction. PDF may be empty or unreadable.');
    }
    
    console.log("   ✅ Input valid");

    const prompt = `You are a financial data extraction assistant. Analyze this bank statement or bill text and extract transaction information.

PDF Content:
"""
${pdfText.substring(0, 5000)} 
"""

Extract and return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "accountInfo": {
    "bankName": "string or null",
    "accountNumber": "last 4 digits only or null",
    "accountHolderName": "string or null"
  },
  "statementPeriod": {
    "from": "YYYY-MM-DD or null",
    "to": "YYYY-MM-DD or null"
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "merchant/description",
      "amount": number (absolute value),
      "type": "debit" or "credit",
      "category": "Food|Groceries|Rent|Transport|Fuel|Utilities|Shopping|Entertainment|Salary|Freelance|Insurance|Savings|Other",
      "balance": number or null
    }
  ]
}

Rules:
1. Convert all dates to YYYY-MM-DD format
2. amount should be absolute value (no negatives)
3. type: "debit" for expenses/withdrawals, "credit" for income/deposits
4. Auto-categorize based on merchant/description (be smart about this)
5. If balance is available in PDF, include it
6. Only include actual transactions (ignore headers/footers)
7. Return valid JSON only - no markdown code blocks`;

    const payload = {
        messages: [
            {
                role: "user",
                content: [{ text: prompt }]
            }
        ],
        inferenceConfig: {
            max_new_tokens: 4000,
            temperature: 0.1
        }
    };

    try {
        console.log("   Calling Bedrock API...");
        const command = new InvokeModelCommand({
            modelId: MODEL_ID,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload),
        });

        console.log("   Sending command...");
        const response = await client.send(command);
        console.log("   ✅ Got response from Bedrock");
        console.log("   Response type:", typeof response);
        console.log("   Response.body exists:", !!response.body);
        
        console.log("   Decoding response body...");
        const decodedBody = new TextDecoder().decode(response.body);
        console.log("   Decoded length:", decodedBody.length);
        console.log("   First 200 chars:", decodedBody.substring(0, 200));
        
        console.log("   Parsing JSON response...");
        const responseBody = JSON.parse(decodedBody);
        console.log("   ✅ Response JSON parsed");
        
        // Use helper functions for validation and extraction
        console.log("\n   STEP 1: Validating response structure...");
        const aiResponse = _validateResponseStructure(responseBody);
        
        console.log("\n   STEP 2: Extracting JSON from AI response...");
        const extracted = _extractJsonFromResponse(aiResponse);
        
        console.log("\n   STEP 3: Validating transaction data...");
        _validateTransactionData(extracted);
        
        console.log("═══════════════════════════════════════════════════════════════");
        console.log(`✅ SUCCESS: Found ${extracted.transactions.length} transactions`);
        console.log("═══════════════════════════════════════════════════════════════\n");
        
        return extracted;
    } catch (error: any) {
        console.error("═══════════════════════════════════════════════════════════════");
        console.error("❌ ERROR IN extractTransactionsFromPdf");
        console.error("═══════════════════════════════════════════════════════════════");
        console.error("   Error type:", error.constructor.name);
        console.error("   Error message:", error.message);
        console.error("   Error stack:", error.stack);
        console.error("═══════════════════════════════════════════════════════════════\n");
        
        // Provide user-friendly error messages based on error type
        if (error instanceof TypeError) {
            throw new Error("Could not properly parse the AI response. Please try again or use a different PDF.");
        }
        if (error.message.includes("No transactions found")) {
            throw error;
        }
        if (error.message.includes("No text available")) {
            throw error;
        }
        if (error.message.includes("No valid AWS credentials")) {
            throw new Error("Authentication failed. Please check your AWS credentials configuration.");
        }
        
        throw new Error(error.message || "Failed to extract transactions from PDF. Please try another file.");
    }
};
