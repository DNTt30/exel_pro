filepath = 'D:/schedule-app/frontend/src/components/ai/AICopilotDrawer.jsx'
with open(filepath, encoding='utf-8') as f:
    lines = f.readlines()

start_idx = None
end_idx = None

for i, line in enumerate(lines):
    if 'handleNewChat' in line:
        for j in range(i, max(i-5, 0), -1):
            if '<div className="flex items-center gap-1' in lines[j]:
                start_idx = j
                break
        for k in range(i, min(i+10, len(lines))):
            if '</button>' in lines[k] and 'Plus' in ''.join(lines[i:k+1]):
                end_idx = k
                break
        break

if start_idx is not None and end_idx is not None:
    replacement = '          <div className="flex items-center gap-1 sm:gap-1.5 relative z-10">\r\n'
    new_lines = lines[:start_idx] + [replacement] + lines[end_idx+1:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    open('D:/schedule-app/fix_result.txt', 'w').write(f'DONE: removed lines {start_idx+1} to {end_idx+1}')
else:
    open('D:/schedule-app/fix_result.txt', 'w').write(f'FAIL: start={start_idx} end={end_idx}')
