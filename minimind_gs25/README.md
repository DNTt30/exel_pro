# GS25 AI Training Guide

## Cấu trúc thư mục
```
minimind_gs25/
├── generate_gs25_qa.py          # Script sinh dataset Q&A nghiệp vụ GS25
├── gs25_qa.jsonl                # Dataset đã sinh (147 cặp Q&A)
├── MiniMind_GS25_Assistant.ipynb # Colab Notebook để train
└── README.md                    # File này
```

## Quy trình Train (Hướng B - Google Colab)

### 1. Upload dataset lên Google Drive
- File: `gs25_qa.jsonl`

### 2. Mở Colab Notebook
- File: `MiniMind_GS25_Assistant.ipynb`
- Bật GPU: Runtime → Change runtime type → T4 GPU
- Bấm Run All

### 3. Sau khi train xong (~2h)
Lấy URL model từ Hugging Face và điền vào file `.env.local` của dự án:

```env
VITE_GS25_AI_MODEL_URL=https://api-inference.huggingface.co/models/your-username/gs25-assistant
VITE_HF_TOKEN=hf_your_token_here
```

### 4. Cơ chế hoạt động trong App
Hệ thống AI Copilot hoạt động theo thứ tự ưu tiên:
1. **Local Engine** (`askAICopilot`): Xử lý câu hỏi về lịch ca, nhân sự (fast, offline)
2. **Ollama** (`localhost:11434`): Nếu người dùng đang chạy Ollama local
3. **GS25 HF Model** (`askGS25HFModel`): Model MiniMind đã train, trả lời câu hỏi nghiệp vụ GS25
4. **Fallback**: Trả lời mặc định từ Local Engine

### Dataset Q&A Coverage
49 chủ đề nghiệp vụ được coverage:
- Ca làm việc (Sáng/Chiều/Đêm/4 tiếng)
- Định mức giờ công (PT/FT/CSR_NEW)
- Quy định nghỉ ngơi giữa ca
- Phụ cấp lương ca đêm & tăng ca
- Chu kỳ lương 26-25
- Luồng đổi ca & bù công
- Phân quyền Admin/SM/NV
- Kệ date & HSD
- Import lịch ezHR
- AI Xếp lịch tự động
- Đồng phục & văn hóa chào khách GS25
