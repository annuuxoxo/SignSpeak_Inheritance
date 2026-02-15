import csv
import json

# Words we need
target_words = ['walk', 'come here', 'up', 'down', 'time', 'ball', 'desk', 'mouse',
                'family', 'boy', 'me', 'student', 'joy', 'big', 'hear', 'arm']

# Read metadata.csv
video_mapping = {}
with open('metadata.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        word = row['gloss'].lower()
        if word in target_words:
            if word not in video_mapping:
                video_mapping[word] = []
            video_mapping[word].append(row['video_id'])

# Display results
print("=" * 70)
print("VIDEO IDs FOR YOUR 16 WORDS")
print("=" * 70)
print("\nFrom WLASL Dataset - Use these video IDs to download:\n")

for word in target_words:
    if word in video_mapping:
        video_ids = video_mapping[word]
        print(f"✓ {word.upper().ljust(15)} - {len(video_ids)} videos available")
        print(f"  Video IDs: {', '.join(video_ids[:3])} {'...' if len(video_ids) > 3 else ''}")
        print(f"  Pick any one (e.g., {video_ids[0]}.mp4)\n")
    else:
        print(f"✗ {word.upper()} - NOT FOUND in metadata\n")

print("=" * 70)
print("\n📥 HOW TO DOWNLOAD:")
print("\n1. WLASL Dataset Source:")
print("   https://github.com/dxli94/WLASL")
print("   Or search: 'WLASL dataset download videos'")
print("\n2. Videos are named: [video_id].mp4")
print("   Example: 62175.mp4 for 'walk'")
print("\n3. Download one video for each word (pick any ID from the list)")
print("\n💡 TIP: If you can't find WLASL videos, record your own or use")
print("   YouTube ASL tutorials (search 'ASL [word] sign tutorial')")
print("=" * 70)
