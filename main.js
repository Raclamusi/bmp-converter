"use strict";

(async function () {
    const imageInput = document.getElementById("imageInput");
    const outputs = new Map(
        ["1", "4", "8", "16", "24", "4RLE", "8RLE"].map(bits => [bits, {
            image: document.getElementById(`imageOutput${bits}`),
            size: document.getElementById(`sizeOutput${bits}`),
        }])
    );

    imageInput.addEventListener("change", async () => {
        for (const [_bits, output] of outputs) {
            output.image.textContent = "";
            output.size.textContent = "";
        }
        if (imageInput.files.length === 0) {
            return;
        }

        const imageFile = imageInput.files[0];
        const imageFileName = imageFile.name.replace(/\.[^\.]+$/, "");
        const imageData = getImageData(await loadImage(imageFile));
        const pallete = makeBMPPallete(imageData);
        
        if (pallete === null || pallete.size > 2) {
            outputs.get("1").image.textContent = "この色数では表現できません";
        }
        else {
            const output = outputs.get("1");
            output.image.textContent = "計算中...";
            await new Promise(resolve => setTimeout(() => resolve()));
            const bmp = makeBMP(makeBMPData1bit(pallete), 1, 0, pallete);
            const downloadLink = document.createElement("a");
            downloadLink.href = makeBMPURL(bmp);
            downloadLink.download = `${imageFileName}_1bit.bmp`;
            downloadLink.textContent = "ダウンロード";
            output.image.textContent = "";
            output.image.appendChild(downloadLink);
            output.size.textContent = `${bmp.length} B`;
        }
        if (pallete === null || pallete.size > 16) {
            outputs.get("4").image.textContent = "この色数では表現できません";
        }
        else {
            const output = outputs.get("4");
            output.image.textContent = "計算中...";
            await new Promise(resolve => setTimeout(() => resolve()));
            const pixels = makeBMPData4bit(pallete);
            const bmp = makeBMP(pixels, 4, 0, pallete);
            const downloadLink = document.createElement("a");
            downloadLink.href = makeBMPURL(bmp);
            downloadLink.download = `${imageFileName}_4bit.bmp`;
            downloadLink.textContent = "ダウンロード";
            output.image.textContent = "";
            output.image.appendChild(downloadLink);
            output.size.textContent = `${bmp.length} B`;
            
            const outputRLE = outputs.get("4RLE");
            outputRLE.image.textContent = "計算中...";
            await new Promise(resolve => setTimeout(() => resolve()));
            const pixelsRLE = makeBMPDataRLE(pixels, imageData.width, 4);
            const bmpRLE = makeBMP(pixelsRLE, 4, 2, pallete);
            const downloadLinkRLE = document.createElement("a");
            downloadLinkRLE.href = makeBMPURL(bmpRLE);
            downloadLinkRLE.download = `${imageFileName}_4bitRLE.bmp`;
            downloadLinkRLE.textContent = "ダウンロード";
            outputRLE.image.textContent = "";
            outputRLE.image.appendChild(downloadLinkRLE);
            outputRLE.size.textContent = `${bmpRLE.length} B`;
        }
        if (pallete === null) {
            outputs.get("8").image.textContent = "この色数では表現できません";
        }
        else {
            const output = outputs.get("8");
            output.image.textContent = "計算中...";
            await new Promise(resolve => setTimeout(() => resolve()));
            const pixels = makeBMPData8bit(pallete);
            const bmp = makeBMP(pixels, 8, 0, pallete);
            const downloadLink = document.createElement("a");
            downloadLink.href = makeBMPURL(bmp);
            downloadLink.download = `${imageFileName}_8bit.bmp`;
            downloadLink.textContent = "ダウンロード";
            output.image.textContent = "";
            output.image.appendChild(downloadLink);
            output.size.textContent = `${bmp.length} B`;
            
            const outputRLE = outputs.get("8RLE");
            outputRLE.image.textContent = "計算中...";
            await new Promise(resolve => setTimeout(() => resolve()));
            const pixelsRLE = makeBMPDataRLE(pixels, imageData.width, 8);
            const bmpRLE = makeBMP(pixelsRLE, 8, 1, pallete);
            const downloadLinkRLE = document.createElement("a");
            downloadLinkRLE.href = makeBMPURL(bmpRLE);
            downloadLinkRLE.download = `${imageFileName}_8bitRLE.bmp`;
            downloadLinkRLE.textContent = "ダウンロード";
            outputRLE.image.textContent = "";
            outputRLE.image.appendChild(downloadLinkRLE);
            outputRLE.size.textContent = `${bmpRLE.length} B`;
        }
        {
            const output = outputs.get("16");
            output.image.textContent = "計算中...";
            await new Promise(resolve => setTimeout(() => resolve()));
            const bmp = makeBMP(makeBMPData16bit(imageData), 16, 0, { width: imageData.width, height: imageData.height });
            const downloadLink = document.createElement("a");
            downloadLink.href = makeBMPURL(bmp);
            downloadLink.download = `${imageFileName}_16bit.bmp`;
            downloadLink.textContent = "ダウンロード";
            output.image.textContent = "";
            output.image.appendChild(downloadLink);
            output.size.textContent = `${bmp.length} B`;
        }
        {
            const output = outputs.get("24");
            output.image.textContent = "計算中...";
            await new Promise(resolve => setTimeout(() => resolve()));
            const bmp = makeBMP(makeBMPData24bit(imageData), 24, 0, { width: imageData.width, height: imageData.height });
            const downloadLink = document.createElement("a");
            downloadLink.href = makeBMPURL(bmp);
            downloadLink.download = `${imageFileName}_24bit.bmp`;
            downloadLink.textContent = "ダウンロード";
            output.image.textContent = "";
            output.image.appendChild(downloadLink);
            output.size.textContent = `${bmp.length} B`;
        }
    });
})();
