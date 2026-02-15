from google.colab import drive
drive.mount('/content/drive')

import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader, random_split
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

train_transform = transforms.Compose([
    transforms.Resize((64, 64)),
    transforms.RandomRotation(10),      #rotating the images by +-10 deg as hand can be slightly tilted
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.5, 0.5, 0.5],
        std=[0.5, 0.5, 0.5]
    )
])

test_transform = transforms.Compose([
    transforms.Resize((64, 64)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.5, 0.5, 0.5],
        std=[0.5, 0.5, 0.5]
    )
])

dataset = datasets.ImageFolder(
    root="/content/drive/MyDrive/datasets/asl-alphabet/asl_alphabet_train/asl_alphabet_train",
    transform=train_transform
)

ctoi = dataset.class_to_idx     #dictionary('A':0)
itoc = {v: k for k, v in ctoi.items()}

print("Images:", len(dataset))
print("Classes:", len(ctoi))

print("\nClass → Index mapping:")
for c, i in ctoi.items():
    print(f"{c} -> {i}")

train_size = int(0.8 * len(dataset))
test_size = len(dataset) - train_size

train_ds,test_ds = random_split(dataset, [train_size, test_size])

test_ds.dataset.transform = test_transform

print("Train images:", len(train_ds))
print("Test images:", len(test_ds))

train_loader = DataLoader(
    train_ds,
    batch_size=32,
    shuffle=True,
    pin_memory=True  #for GPU optimization
)

test_loader = DataLoader(
    test_ds,
    batch_size=32,
    shuffle=False,
    pin_memory=True
)

print("Train batches:", len(train_loader))
print("Validation batches:", len(test_loader))

model=nn.Sequential(
   nn.Conv2d(3,32,kernel_size=3,padding=1),
   nn.ReLU(),
   nn.MaxPool2d(2,2),
   #32*32*32

   nn.Conv2d(32,64,kernel_size=3,padding=1),
   nn.ReLU(),
   nn.MaxPool2d(2,2),      #2*2 max pooling && stride=2(move 2 pixel at a time)
   #64*16*16

   nn.Conv2d(64,128,kernel_size=3,padding=1),
   nn.ReLU(),
   nn.MaxPool2d(2,2),
   #128*8*8

   nn.Flatten(),
   nn.Linear(128 * 8 * 8, 256),
   nn.ReLU(),
   nn.Dropout(0.5),       #prevents overfitting
   nn.Linear(256, 29)     #29 classes(26 alphabets and space,del,nothing)
)

model = model.to(device)
print(model)

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)


num_epochs = 5

for epoch in range(num_epochs):
    model.train()
    running_loss=0.0
    correct=0
    total=0

    for images,labels in train_loader:

        images=images.to(device)
        labels=labels.to(device)

        optimizer.zero_grad()

        outputs=model(images)
        loss=criterion(outputs, labels)

        loss.backward()
        optimizer.step()

        running_loss+=loss.item()

        _, predicted=torch.max(outputs, 1)
        total+=labels.size(0)
        correct+=(predicted == labels).sum().item()

    epoch_loss=running_loss / len(train_loader)
    epoch_acc=100 * correct / total

    print(f"Epoch [{epoch+1}/{num_epochs}] "
          f"Loss: {epoch_loss:.4f} "
          f"Accuracy: {epoch_acc:.2f}%")

model.eval()

test_loss = 0.0
correct = 0
total = 0

with torch.no_grad():
    for images, labels in test_loader:

        images = images.to(device)
        labels = labels.to(device)

        outputs = model(images)
        loss = criterion(outputs, labels)

        test_loss += loss.item()

        _, predicted = torch.max(outputs, 1)
        total += labels.size(0)
        correct += (predicted == labels).sum().item()

avg_test_loss = test_loss / len(test_loader)
test_accuracy = 100 * correct / total

print(f"Test Loss: {avg_test_loss:.4f}")
print(f"Test Accuracy: {test_accuracy:.2f}%")

import os

save_dir = "/content/drive/MyDrive/models"
os.makedirs(save_dir, exist_ok=True)

model_path = os.path.join(save_dir, "Final_Model.pth")

torch.save(model, model_path)

print("Full model saved at:", model_path)
