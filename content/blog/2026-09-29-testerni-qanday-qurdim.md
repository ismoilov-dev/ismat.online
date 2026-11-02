---
title: Tester'ni qanday qurdim
date: 2026-09-30
lang: uz
description: Mentorlikdagi muammodan ~200 foydalanuvchili anti-cheat test platformasigacha.
tags:
  - django
  - drf
  - react
  - anti-cheat
  - mcp
  - startup
draft: false
---
Sfera Academy'da mentor bo'lib ishlaganimda testlarni Google Forms orqali olardim. Natijalar juda yaxshi chiqardi. Darsda \`for\` siklini zo'rg'a yozadigan o'quvchi ham 10 dan 10 olardi. Sababi oddiy edi: o'quvchi yangi tab ochadi, savolni ChatGPT'ga tashlaydi va javobni ko'chiradi. Men bilimni emas, tab almashtirish tezligini o'lchayotgan ekanman.



Tester shu muammodan boshlandi.



\## G'oya



O'qituvchi testni yaratadi va Google Meet'dagidek bitta havola tarqatadi (\`tester.lesson24.uz/dqn-rfab-teu\`). O'quvchilar shu havola orqali kirib test topshiradi. Platforma ko'chirishga urinishlarni kuzatadi, o'qituvchi esa jarayonni jonli ko'rib turadi.



\## Texnologiya



Avvaliga real-time va ko'p foydalanuvchi bo'lgani uchun Go'ni o'yladim. Oxiri \*\*Django + DRF + PostgreSQL\*\*'ni tanladim, chunki mahsulotni tez chiqarish muhimroq edi. Bitta guruhda 20–30 o'quvchi bo'ladi, bu Django uchun muammo emas.



Avval backend'ni to'liq yozib serverga joyladim, keyin \*\*React + TypeScript\*\* frontend'ni tayyor API ustiga qurdim. Kirish Google OAuth2 va JWT orqali ishlaydi.



\## Anti-cheat



Brauzer hamma narsani ko'ra olmaydi. O'quvchi telefoniga qarasa, buni JavaScript aniqlay olmaydi. Shuning uchun maqsadni ko'chirishni qiyin va ko'rinadigan qilish deb belgiladim:



\- \*\*Tab va oyna\*\*: \`visibilitychange\` va \`blur\` hodisalari.

\- \*\*Kamera\*\*: kadrda yuz yo'qolsa, ogohlantirish beriladi.

\- \*\*Ovoz\*\*: shovqin bo'lsa, faqat hodisa sifatida yoziladi.



Har bir hodisa alohida saqlanadi. O'qituvchi bitta "ko'chirdi" belgisini emas, butun tarixni ko'radi va qarorni o'zi qabul qiladi.



Birinchi testdan muhim saboq oldim: kamera ruxsati oynasi yoki tizim bildirishnomasi ham \`blur\` hodisasini beradi. Noto'g'ri ayblov o'qituvchining ishonchini yo'qotadi, shuning uchun bunday holatlarni filtrlashga to'g'ri keldi.



\## Claude connector



O'qituvchilar eng ko'p vaqtni savol kiritishga sarflayotganini ko'rib, Tester uchun MCP server yozdim. Endi o'qituvchi Claude'ga "kasrlar mavzusida 15 ta savollik test tuz" deb yozadi, test esa to'g'ridan-to'g'ri Tester'da paydo bo'ladi.



\## Hozir



Tester ishlab turibdi, ~200 foydalanuvchisi bor. Uni Lesson24 jamoasida Otabek Nabiyev bilan birga rivojlantiryapmiz. Katta maqsadimiz DTM darajasidagi testlarni ham Tester'da o'tkazish.



Siz ham o'qituvchi bo'lsangiz, sinab ko'ring: \[tester.lesson24.uz](https://tester.lesson24.uz)
