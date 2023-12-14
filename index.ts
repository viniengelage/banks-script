import axios from 'axios';
import * as fs from 'fs';

axios.defaults.headers.common["Accept-Encoding"] = "gzip";

import rawBanks from "./banks/raw.json"

import { v4 as uuidV4 } from "uuid"


interface Bank {
    id: string;
    code: string;
    name: string;
}

interface BankWithIcon extends Bank {
    url: string;
    icon_file: string;
    icon_url: string;
    file_external_url: string;
    display_name: string;
}

const newBanks: BankWithIcon[] = []
const notFoundBanks: Bank[] = []

async function downloadWithIcons(data: Bank) {
    const query = data.name.replace(/\(.*\)/, '').replace(/s\.a\.?|s\/a/gi, '').replace(/ltda/gi, '').toLocaleLowerCase().trim();

    const companyUrl = `https://api.brandfetch.io/v2/search/${query}`;

    const filename = `${data.code}-icon.png`
    const destinationPath = `icons/${filename}`

    try {
        const { data: companies } = await axios.get(companyUrl);

        if (companies.length) {
            const company = companies[0];

            const response = await axios.get(company.icon, { responseType: 'arraybuffer' });

            const imageBuffer = Buffer.from(response.data);

            fs.writeFileSync(destinationPath, imageBuffer);

            newBanks.push({
                ...data,
                icon_file: filename,
                icon_url: destinationPath,
                file_external_url: company.icon,
                url: company.domain,
                display_name: company.name
            })
        } else {
            console.log("Empresa não encontrada", data.name)

            notFoundBanks.push({
                name: data.name,
                code: data.code,
                id: data.id
            })
        }
    } catch (error) {
        console.log(`Erro com banco ${query}, seguindo para o proximo`)

        notFoundBanks.push({
            name: data.name,
            code: data.code,
            id: data.id
        })
    }
}


async function render() {
    const total = rawBanks.length;
    let progress = 0;

    for (let index = 0; index < total; index++) {
        const item = rawBanks[index];

        console.log(`Processando: ${item.bank}`)

        const data: Bank = {
            id: uuidV4(),
            code: item.code.toString(),
            name: item.bank,
        }

        await downloadWithIcons(data);

        console.log("Finalizado, indo para o próximo!")

        progress++

        const percentage = (progress / total) * 100;

        console.log(`Progresso: ${percentage.toFixed(2)}%`);

        await new Promise(resolve => setTimeout(resolve, 700));
    }

    const banks = JSON.stringify(newBanks, null, 2)
    const banksNotFounded = JSON.stringify(notFoundBanks, null, 2)

    fs.writeFileSync("banks/list.json", banks)
    fs.writeFileSync("banks/not-found.json", banksNotFounded)

    console.log('Processamento concluído');
}

render();



