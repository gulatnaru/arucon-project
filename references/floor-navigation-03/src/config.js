/* All numbers below are PROTOTYPE fixtures, not production balancing decisions. */
(function(root,factory){const v=factory();if(typeof module==='object'&&module.exports)module.exports=v;else root.AruconConfig=v;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
return Object.freeze({
  version:'life-proto-0.1', schema:1, meterScale:60, expScale:1000000, startClockMinutes:480,
  initial:{food:8,coins:180,hunger:68,stamina:100,poop:1,personality:'reserved'},
  foodCap:20, stepsPerFood:500, stepsPerCoin:100, expPerFood:15,
  hungerMax:100, hungerPerHour:24, hungerPerFood:30, mealThreshold:60,
  staminaMax:100, staminaPerHour:5, staminaPerFood:1, lowStamina:20, lowMultiplier:0.5,
  sickMultiplier:0.5, moodBands:[{minimum:4,multiplier:0.75},{minimum:2,multiplier:0.9},{minimum:0,multiplier:1}],
  poopEveryMinutes:360, poopEveryFoods:8,
  dirtyThreshold:4, sickAfterMinutes:1440, recoveryMinutes:720,
  hibernateMinutes:1440, maxAdvanceMinutes:10080,
  sleepMinMinutes:240, sleepRecovery:80, journalLimit:36, receiptLimit:512,
  shop:{
    table:{label:'작은 식탁',price:60,description:'허용한 먹이로 스스로 식사해요.',kind:'facility'},
    toilet:{label:'포근 화장실',price:70,description:'청소를 졸업해요. 유지비는 없어요.',kind:'facility'},
    ball:{label:'통통 공',price:20,description:'각자의 방식으로 놀아봐요.',kind:'toy'},
    cushion:{label:'구름 쿠션',price:25,description:'좋아하는 쉬는 자리를 마련해요.',kind:'furniture'}
  }
});});
