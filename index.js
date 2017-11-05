/*
	version 1.0
	Update : 2017-11-06
	무료 룩덕

	***
	K-TERA 17-11-06 version
		S_USER_EXTERNAL_CHANGE.2.def
		S_GET_USER_LIST.6.def
	***
*/
const path = require('path');
const fs = require('fs');
const format = require('./format.js');

const TYPE = {
	머리: 'hairAdornment',
	얼굴: 'mask',
	등: 'back',
	무기: 'weaponSkin',
	옷: 'costume',
	염색: 'costumeDye',
};

module.exports = function lookDuck(dispatch) {
	let presets;
	try {
		presets = require('./presets.json');
	} catch (e) {
		presets = {};
	}

	let me = {
		playerId: null,
		cid: null,
		name: null,
		defaultLook: {},
	};

	// 캐릭터 목록에서 코스튬 적용
	dispatch.hook('S_GET_USER_LIST', '*', event => {
		for (let i = 0; i < event.characters.length; i++) {
			// 프리셋 없으면 넘김
			if (!presets.hasOwnProperty(event.characters[i].id)) continue;
			// 있으면 변경
			const preset = presets[event.characters[i].id];
			for (const key in preset) event.characters[i][key] = preset[key];
		}
		return true;
	});

	// 캐릭터 로그인 하면 초기값 설정
	dispatch.hook('S_LOGIN', '*', event => {
		me.cid = event.cid;
		me.name = event.name;
		me.playerId = event.playerId;
		me.defaultLook = null;
	});

	// 나의 외형 변경
	dispatch.hook('S_USER_EXTERNAL_CHANGE', '*', event => {
		if (!event.id.equals(me.cid)) return;

		// 디폴트 룩
		if (!me.defaultLook) me.defaultLook = Object.assign({}, event);

		// 프리셋이 있는경우
		if (presets.hasOwnProperty(me.playerId)) {
			const preset = presets[me.playerId];
			const newEvent = Object.assign({}, me.defaultLook, preset);
			dispatch.toClient('S_USER_EXTERNAL_CHANGE', '*', newEvent);
		}

		// 이것 없으면 클라이언트 계쏙 튕김 블럭당할수도 있음.
		return false;
	});

	// 룩입어보기 했을때
	// TODO: 스타일 창 열었을때만 적용되도록 변경해야함
	dispatch.hook('C_REQUEST_NONDB_ITEM_INFO', '*', event => {
		//sendSysMsg(`번호 : ${event.item}`);
		console.log(`번호 : ${event.item}`);
	});

	/*******************************************************
	 * 채팅
	 *******************************************************/
	function chatHook(event) {
		let cmd = format.stripTags(event.message).split(' ');
		if (['!룩덕'].includes(cmd.shift())) {
			chatCmd.apply(null, cmd.slice());
			return false;
		}
	}

	function chatCmd(order, number) {
		switch (order) {
			case '옷':
			case '등':
			case '무기':
			case '머리':
			case '날개':
			case '얼굴':
				if (!number) break;
				presets[me.playerId] = Object.assign({}, presets[me.playerId]);
				presets[me.playerId][TYPE[order]] = Number(number);
				changeExternal(presets[me.playerId]);
				break;
			case '염색':
				if (!number) break;
				// FFFFFFFF (A, R, G, B)
				// 01010101 적어도 보다 큰값으로 할 것
				presets[me.playerId] = Object.assign({}, presets[me.playerId]);
				presets[me.playerId][TYPE[order]] = parseInt(number, 16);
				changeExternal(presets[me.playerId]);
				break;
			case '초기화':
				delete presets[me.playerId];
				changeExternal(me.defaultLook);
				break;
			case '적용':
				changeExternal(presets[me.playerId]);
				break;
			default:
				sendSysMsg(`[옷, 무기, 머리, 날개, 얼굴, 염색] 숫자`);
		}
		return false;
	}

	function sendSysMsg(msg) {
		dispatch.toClient('S_CHAT', 1, {
			channel: 24,
			authorName: '',
			message: '   ' + msg,
		});
	}

	dispatch.hook('C_CHAT', 1, chatHook);

	/*******************************************************
	 * 보조함수
	 *******************************************************/

	// 외형 변경시
	async function changeExternal(event) {
		const newEvent = Object.assign({}, me.defaultLook, event);
		console.log(newEvent);
		dispatch.toClient('S_USER_EXTERNAL_CHANGE', '*', newEvent);
		await presetSave();
	}

	// 프리셋 저장함수
	function presetSave() {
		return new Promise((resolve, reject) => {
			const filePath = path.join(__dirname, 'presets.json');
			const json = JSON.stringify(presets, null, 4);

			fs.writeFile(filePath, json, err => {
				if (err) reject(err);
				else resolve();
			});
		});
	}
};
