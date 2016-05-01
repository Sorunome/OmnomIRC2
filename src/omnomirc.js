/**
 * @license
 * OmnomIRC COPYRIGHT 2010,2011 Netham45
 *                    2012-2016 Sorunome
 *
 *  This file is part of OmnomIRC.
 *
 *  OmnomIRC is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  OmnomIRC is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with OmnomIRC.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';
var OmnomIRC = function(){
	var OMNOMIRCSERVER = 'https://omnomirc.omnimaga.org',
		eventOnMessage = function(line,loadMode){
			if(loadMode === undefined){
				loadMode = false;
			}
			request.setCurLine(line.curline);
			if(line.name === null || line.network == -1){
				return;
			}
			oirc.onmessage(line,loadMode);
		},
		settings = (function(){
			var self = {
				hostname:'',
				nick:'',
				signature:'',
				numHigh:4,
				uid:-1,
				checkLoginUrl:'',
				net:'',
				networks:{},
				pmIdent:false,
				guestLevel:0,
				isGuest:true,
				identGuest:function(name,fn){
					network.getJSON('misc.php?identName='+base64.encode(name),function(data){
						if(fn!==undefined){
							fn(data);
						}
					});
				},
				fetch:function(fn,clOnly){
					if(clOnly===undefined){
						clOnly = false;
					}
					if(clOnly && self.loggedIn() && self.isGuest){
						self.identGuest(self.nick,function(data){
							if(data.success){
								self.signature = data.signature;
							}
						})
						return;
					}
					network.getJSON('config.php?js'+(document.URL.split('network=')[1]!==undefined?'&network='+document.URL.split('network=')[1].split('&')[0].split('#')[0]:'')+(clOnly?'&clonly':''),function(data){
						var set;
						if(!clOnly){
							self.hostname = data.hostname;
							channels.setChans(data.channels);
							parser.setSmileys(data.smileys);
							parser.setSpLinks(data.spLinks);
							
							self.guestLevel = data.guests;
							self.networks = {};
							$.each(data.networks,function(i,n){
								self.networks[n.id] = n;
							});
							self.net = data.network;
							ls.setPrefix(self.net);
							options.setDefaults(data.defaults);
							options.setExtraChanMsg(data.extraChanMsg);
							request.setData(data.websockets.use,data.websockets.host,data.websockets.port,data.websockets.ssl);
						}
						
						self.checkLoginUrl = data.checkLoginUrl;
						if(self.loggedIn() && self.isGuest){
							self.identGuest(self.nick,function(data){
								if(data.success){
									self.signature = data.signature;
								}
							});
						}else{
							network.getJSON(self.checkLoginUrl+'&network='+self.net.toString()+'&jsoncallback=?',function(data){
								self.nick = data.nick;
								self.signature = data.signature;
								self.uid = data.uid;
								self.pmIdent = '['+self.net.toString()+','+self.uid.toString()+']';
								self.isGuest = data.signature === '';
								
								if(fn!==undefined){
									fn();
								}
							},true,false);
						}
					},true,false);
				},
				setIdent:function(nick,sig,uid){
					self.nick = nick;
					self.signature = sig;
					self.uid = uid;
				},
				getUrlParams:function(){
					return 'nick='+base64.encode(self.nick)+'&signature='+base64.encode(self.signature)+'&time='+(+new Date()).toString()+'&id='+self.uid+'&network='+self.net+'&noLoginErrors';
				},
				getNetwork:function(i){
					if(self.networks[i]!==undefined){
						return self.networks[i];
					}
					return {
						id:-1,
						normal:'NICK',
						userlist:'NICK',
						name:'Invalid network',
						type:-1
					};
				},
				getIdentParams:function(){
					return {
						nick:self.nick,
						signature:self.signature,
						time:(+new Date()).toString(),
						id:self.uid,
						network:self.net
					};
				},
				loggedIn:function(){
					return self.signature !== '';
				},
				guestLevel:function(){
					return self.guestLevel;
				},
				getWholePmIdent:function(uid,net){
					var otherhandler = '['+net.toString()+','+uid.toString()+']';
					if(net < self.net){
						return otherhandler+self.pmIdent;
					}else if(self.net < net){
						return self.pmIdent+otherhandler;
					}else if(uid < self.uid){
						return otherhandler+self.pmIdent;
					}else{
						return self.pmIdent+otherhandler;
					}
				}
			};
			return {
				identGuest:self.identGuest,
				fetch:self.fetch,
				setIdent:self.setIdent,
				getUrlParams:self.getUrlParams,
				getIdentParams:self.getIdentParams,
				getNetwork:self.getNetwork,
				nick:function(){
					return self.nick;
				},
				net:function(){
					return self.net;
				},
				loggedIn:self.loggedIn,
				guestLevel:self.guestLevel,
				getPmIdent:function(){
					return self.pmIdent;
				},
				isGuest:function(){
					return self.isGuest;
				},
				getWholePmIdent:self.getWholePmIdent
			};
		})(),
		ls = (function(){
			var self = {
				prefix:(document.URL.split('network=')[1]!==undefined?document.URL.split('network=')[1].split('&')[0].split('#')[0]:''),
				setPrefix:function(p){
					self.prefix = p;
				},
				getCookie:function(c_name){
					var i,x,y,ARRcookies=document.cookie.split(";");
					for(i=0;i<ARRcookies.length;i++){
						x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
						y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
						x=x.replace(/^\s+|\s+$/g,"");
						if(x==c_name){
							return unescape(y);
						}
					}
				},
				setCookie:function(c_name,value,exdays){
					var exdate = new Date(),
						c_value = escape(value);
					exdate.setDate(exdate.getDate() + exdays);
					c_value += ((exdays===null) ? '' : '; expires='+exdate.toUTCString());
					document.cookie=c_name + '=' + c_value;
				},
				haveSupport:null,
				support:function(){
					if(self.haveSupport===null){
						try{
							localStorage.setItem('test',1);
							localStorage.removeItem('test');
							self.haveSupport = true;
						}catch(e){
							self.haveSupport = false;
						}
					}
					return self.haveSupport;
				},
				get:function(name){
					var s;
					name = self.prefix+name;
					if(self.support()){
						s = localStorage.getItem(name);
					}else{
						s = getCookie(name);
					}
					return JSON.parse(s);
				},
				set:function(name,value){
					name = self.prefix+name;
					value = JSON.stringify(value);
					if(self.support()){
						localStorage.setItem(name,value);
					}else{
						setCookie(name,value);
					}
				}
			}
			return {
				setPrefix:self.setPrefix,
				get:self.get,
				set:self.set
			};
		})(),
		network = (function(){
			var self = {
				removeSig:function(s){
					try{
						var parts = s.split('signature='),
							moreParts = parts[1].split('&');
						moreParts[0] = '---';
						parts[1] = moreParts.join('&');
						return parts.join('signature=');
					}catch(e){
						if(s.indexOf('signature')!==-1){
							return 'omited due to security reasons';
						}
						return s;
					}
				},
				addError:function(s,e){
					s = self.removeSig(s);
					oirc.onerror(s,e);
				},
				addWarning:function(s,e){
					s = self.removeSig(s);
					oirc.onwarning(s,e);
				},
				checkCallback:function(data,fn,recall,url){
					if(data.relog!=2){
						if(data.errors!==undefined){
							$.map(data.errors,function(e){
								if(e.type!==undefined){
									self.addError(url,e);
								}else{
									self.addError(url,{
										type:'misc',
										message:e
									});
								}
							});
						}
						if(data.warnings!==undefined){
							$.map(data.warnings,function(w){
								if(w.type!==undefined){
									self.addWarning(url,w);
								}else{
									self.addWarning(url,{
										type:'misc',
										message:w
									});
								}
							});
						}
					}
					if(data.relog!==undefined && data.relog!=0){
						if(data.relog==1){
							settings.fetch(undefined,true); // everything is still fine, no need to block the rest of the thread
							fn(data);
						}else if(data.relog==2){
							settings.fetch(function(){
								recall();
							},true);
						}else{ // that's it, we'r out
							fn(data);
						}
					}else{
						if(data.relog!==undefined){
							self.didRelog = false; // relog successfull, new try!
						}
						fn(data);
					}
				},
				getJSON:function(s,fn,async,urlparams){
					if(async==undefined){
						async = true;
					}
					if(urlparams==undefined){
						urlparams = true;
					}
					if(s.indexOf('?') == -1 && urlparams){
						s += '?';
					}
					var url = s+(urlparams?'&'+settings.getUrlParams():'');
					return $.ajax({
							url:url,
							dataType:'json',
							async:async
						})
						.done(function(data){
							self.checkCallback(data,fn,function(){
								self.getJSON(s,fn,async,urlparams);
							},url);
						});
				},
				post:function(s,pdata,fn,async,urlparams){
					if(async==undefined){
						async = true;
					}
					if(urlparams==undefined){
						urlparams = true;
					}
					if(s.indexOf('?') == -1 && urlparams){
						s += '?';
					}
					var url = s+(urlparams?'&'+settings.getUrlParams():'');
					return $.ajax({
							type:'POST',
							url:url,
							async:async,
							data:pdata
						})
						.done(function(data){
							self.checkCallback(data,fn,function(){
								self.post(s,pdata,fn,async,urlparams);
							},url);
						});
				}
			};
			return {
				getJSON:self.getJSON,
				post:self.post
			};
		})(),
		options = (function(){
			var self = {
				extraChanMsg:'',
				allOptions:{
					highBold:{
						disp:'Highlight Bold',
						default:true
					},
					highRed:{
						disp:'Highlight Red',
						default:true
					},
					colordNames:{
						disp:'Colored Names',
						default:0,
						handler:function(){
							return $('<td>')
								.attr('colspan',2)
								.css('border-right','none')
								.append($('<select>')
									.change(function(){
										self.set('colordNames',this.value);
									})
									.append(
										$.map(['none','calc','server'],function(v,i){
											return $('<option>')
												.attr((self.get('colordNames')==i?'selected':'false'),'selected')
												.val(i)
												.text(v);
										})
									)
								)
						}
					},
					curChan:{
						hidden:true,
						default:0
					},
					extraChans:{
						disp:'Show extra Channels',
						default:false,
						before:function(){
							if(self.extraChanMsg!==''){
								alert(self.extraChanMsg);
							}
							return true;
						}
					},
					altLines:{
						disp:'Alternating Line Highlight',
						default:true
					},
					enable:{
						disp:'Enable OmnomIRC',
						default:true
					},
					ding:{
						disp:'Ding on Highlight',
						default:false
					},
					times:{
						disp:'Show Timestamps',
						default:true
					},
					statusBar:{
						disp:'Show Updates in Browser Status Bar',
						default:true
					},
					smileys:{
						disp:'Show Smileys',
						default:true
					},
					hideUserlist:{
						disp:'Hide Userlist',
						default:false
					},
					charsHigh:{
						disp:'Number chars for Highlighting',
						default:4,
						handler:function(){
							return $('<td>')
								.attr('colspan',2)
								.css('border-right','none')
								.append($('<select>')
									.change(function(){
										self.set('charsHigh',this.value);
									})
									.append(
										$.map([1,2,3,4,5,6,7,8,9,10],function(i){
											return $('<option>')
												.attr((self.get('charsHigh')==i?'selected':'false'),'selected')
												.val(i)
												.text(i);
										})
									)
								);
						}
					},
					scrollBar:{
						disp:'Show Scrollbar',
						default:true
					},
					scrollWheel:{
						disp:'Enable Scrollwheel',
						default:true
					},
					browserNotifications:{
						disp:'Browser Notifications',
						default:false,
						before:function(){
							notification.request();
							return false;
						}
					},
					oircJoinPart:{
						disp:'Show OmnomIRC join/part messages',
						default:false
					},
					wysiwyg:{
						disp:'Use WYSIWYG editor',
						default:true
					},
					textDeco:{
						disp:'Enable simple text decorations',
						default:false
					},
					fontSize:{
						disp:'Font Size',
						default:9,
						handler:function(){
							return $('<td>')
								.attr('colspan',2)
								.css('border-right','none')
								.append($('<input>')
									.attr({
										type:'number',
										step:1,
										min:1,
										max:42
									})
									.css('width','3em')
									.val(self.get('fontSize'))
									.change(function(){
										self.set('fontSize',parseInt(this.value,10));
										$('body').css('font-size',this.value+'pt');
									})
								)
						}
					}
				},
				set:function(s,v){
					if(self.allOptions[s]===undefined){
						return;
					}
					self.allOptions[s].value = v;
					var opts = ls.get('options') || {};
					opts[s] = v;
					ls.set('options',opts);
				},
				get:function(s){
					if(self.allOptions[s]!==undefined){
						return self.allOptions[s].value;
					}
				},
				setExtraChanMsg:function(s){
					self.extraChanMsg = s;
				},
				setDefaults:function(def){
					var opts = ls.get('options');
					$.each(self.allOptions,function(i,v){
						var val = v.default;
						if(opts && opts[i]!==undefined){
							val = opts[i];
						}else if(def && def[i]!==undefined){
							val = def[i];
						}
						self.allOptions[i].value = val;
					});
				},
				getAll:function(){
					var a = {};
					$.each(self.allOptions,function(i,v){
						if(v.hidden===undefined || !v.hidden){
							a[i] = v.value;
						}
					});
					return a;
				}
			};
			return {
				set:self.set,
				get:self.get,
				setDefaults:self.setDefaults,
				setExtraChanMsg:self.setExtraChanMsg,
				getAll:self.getAll
			};
		})(),
		instant = (function(){
			var self = {
				id:Math.random().toString(36)+(new Date()).getTime().toString(),
				update:function(){
					ls.set('browserTab',self.id);
					ls.set('newInstant',false);
				},
				init:function(){
					ls.set('browserTab',self.id);
					$(window).focus(function(){
						self.update();
					}).unload(function(){
						self.kill();
					});
				},
				current:function(){
					if(ls.get('newInstant')){
						self.update();
					}
					return self.id == ls.get('browserTab');
				},
				kill:function(){
					ls.set('newInstant',true);
					$(window).off('focus').off('unload');
				}
			};
			return {
				init:self.init,
				current:self.current,
				kill:self.kill
			};
		}()),
		request = (function(){
			var self = {
				ws:{
					socket:false,
					connected:false,
					use:true,
					sendBuffer:[],
					allowLines:false,
					enabled:false,
					host:'',
					port:0,
					ssl:true,
					tryFallback:true,
					didRelog:false,
					fallback:function(){
						console.log('trying fallback...');
						if(self.ws.tryFallback){
							try{
								self.ws.tryFallback = false;
								self.ws.socket.close();
							}catch(e){}
							network.getJSON('misc.php?getcurline&noLoginErrors',function(data){
								//channels.current().reloadUserlist(); // this is usually a good idea.
								self.setCurLine(data.curline);
								self.ws.use = false;
								self.old.lastSuccess = (new Date).getTime();
								self.old.start();
							});
						}
					},
					identify:function(){
						self.ws.send($.extend({action:'ident'},settings.getIdentParams()));
						self.ws.send({action:'charsHigh','chars':options.get('charsHigh')});
					},
					init:function(){
						if(!("WebSocket" in window) || !self.ws.enabled){
							self.ws.use = false;
							return false;
						}
						
						try{
							var path = window.location.pathname.split('/');
							path.pop();
							if(path.length > 1 && path[path.length-1] === ''){
								path.pop();
							}
							path.push('ws');
							path.push(settings.net());
							self.ws.socket = new PooledWebSocket((self.ws.ssl?'wss://':'ws://')+self.ws.host+':'+self.ws.port.toString()+path.join('/'));
						}catch(e){
							console.log(self.ws.socket);
							console.log((self.ws.ssl?'wss://':'ws://')+self.ws.host+':'+self.ws.port.toString()+path.join('/'));
							console.log(e);
							self.ws.fallback();
						}
						self.ws.socket.onopen = function(e){
							self.ws.connected = true;
							for(var i = 0;i < self.ws.sendBuffer.length;i++){
								self.ws.send(self.ws.sendBuffer[i]);
							}
							self.ws.sendBuffer = [];
						};
						self.ws.socket.onmessage = function(e){
							try{
								var data = JSON.parse(e.data);
								console.log(data);
								if(self.ws.allowLines && data.line!==undefined){
									if(eventOnMessage(data.line)){
										self.ws.tryFallback = false;
										delete self.ws.socket;
									}
								}
								if(data.relog!==undefined && data.relog!=0 && data.relog < 3){
									if(!self.ws.didRelog){
										self.ws.didRelog = true;
										settings.fetch(function(){
											if(settings.loggedIn()){
												self.ws.identify();
												self.ws.didRelog = false;
											}
										},true);
									}
								}
							}catch(e){};
						};
						self.ws.socket.onclose = function(e){
							console.log('CLOOOOOOOOOSE');
							console.log(e);
							self.ws.use = false;
							self.ws.fallback();
						};
						self.ws.socket.onerror = function(e){
							console.log('ERRRORRRR');
							console.log(e);
							delete self.ws.socket;
							self.ws.use = false;
							self.ws.fallback();
						};
						
						self.ws.identify();
						
						$(window).on('beforeunload',function(){
							self.partChan(channels.current().handler);
							delete self.ws.socket;
						});
						
						return true;
					},
					send:function(msg){
						if(self.ws.connected){
							self.ws.socket.send(JSON.stringify(msg));
						}else{
							self.ws.sendBuffer.push(msg);
						}
					}
				},
				old:{
					inRequest:false,
					handler:false,
					lastSuccess:(new Date).getTime(),
					fnCallback:undefined,
					chan:'',
					sendRequest:function(){
						if(!self.old.chan){
							return;
						}
						self.old.handler = network.getJSON(
								'Update.php?high='+
								options.get('charsHigh').toString()+
								'&channel='+self.old.chan+
								'&lineNum='+self.curLine.toString(),
							function(data){
								self.old.handler = false;
								self.old.lastSuccess = (new Date).getTime();
								if(data.lines!==undefined){
									$.each(data.lines,function(i,line){
										eventOnMessage(line);
									});
								}
								if(data.errors!=undefined && data.errors.length >= 1){
									return;
								}
								if(data.banned !== true){
									self.old.setTimer();
								}
							})
							.fail(function(){
								self.old.handler = false;
								if(self.fnCallback!=undefined){
									self.fnCallback();
									self.fnCallback = undefined;
									return;
								}
								if((new Date).getTime() >= self.old.lastSuccess + 300000){
									send.internal('<span style="color:#C73232;">OmnomIRC has lost connection to server. Please refresh to reconnect.</span>');
								}else if(!self.old.inRequest){
									self.old.lastSuccess = (new Date).getTime();
								}else{
									self.old.setTimer();
								}
							});
					},
					setTimer:function(){
						if(self.old.inRequest && channels.current().loaded && self.old.handler===false){
							setTimeout(function(){
								self.old.sendRequest();
							},200);
						}else{
							self.old.stop();
						}
					},
					start:function(){
						if(!self.old.inRequest){
							self.old.inRequest = true;
							self.old.setTimer();
						}
					},
					stop:function(fn){
						if(self.old.inRequest){
							self.old.inRequest = false;
							if(self.old.handler){
								self.fnCallback = fn;
								self.old.handler.abort();
							}else if(fn!==undefined){
								fn();
							}
						}else if(fn!==undefined){
							fn();
						}
					},
					send:function(s,chan,fn){
						self.old.stop(function(){
							network.getJSON('message.php?message='+base64.encode(s)+'&channel='+chan,function(){
								self.old.start();
								if(fn!==undefined){
									fn();
								}
							});
						});
					}
				},
				curLine:0,
				joinChan:function(c){
					if(self.ws.use){
						self.ws.send({
							action:'joinchan',
							chan:c
						});
					}
					
					if(parseInt(c,10) != c){
						c = base64.encode(c);
					}
					self.old.chan = c;
				},
				partChan:function(c){
					if(self.ws.use){
						self.ws.send({
							action:'partchan',
							chan:c
						});
					}
				},
				stop:function(fn){
					if(self.ws.use){
						self.ws.allowLines = false;
						fn();
					}else{
						self.old.stop(fn);
					}
				},
				kill:function(){
					if(self.ws.use){
						self.ws.socket.onclose = function(){}; // ignore the close event
						self.ws.socket.close();
					}else{
						self.old.stop();
					}
				},
				start:function(){
					if(self.ws.use){
						self.ws.allowLines = true;
					}else{
						self.old.start();
					}
				},
				setCurLine:function(c){
					if(c > self.curLine){
						self.curLine = c;
					}
				},
				send:function(s,chan,fn){
					if(self.ws.use){
						self.ws.send({
							action:'message',
							channel:chan,
							message:s
						});
						if(fn!==undefined){
							fn();
						}
					}else{
						if(parseInt(chan,10)!=chan){
							chan = base64.encode(chan);
						}
						self.old.send(s,chan,fn);
					}
				},
				setData:function(enabled,host,port,ssl){
					self.ws.enabled = enabled;
					self.ws.host = host;
					self.ws.port = port;
					self.ws.ssl = ssl;
				},
				init:function(){
					if(self.ws.enabled){
						self.ws.init();
					}else{
						self.ws.use = false;
						self.old.lastSuccess = (new Date).getTime();
					}
				},
				identify:function(){
					if(self.ws.enabled){
						self.ws.identify();
					}
				}
			};
			return {
				joinChan:self.joinChan,
				partChan:self.partChan,
				start:self.start,
				stop:self.stop,
				kill:self.kill,
				setCurLine:self.setCurLine,
				send:self.send,
				setData:self.setData,
				init:self.init,
				identify:self.identify
			};
		})(),
		channels = (function(){
			var Channel = function(i){
				var exists = self.chans[i]!==undefined,
					_self = {
						i:i,
						name:exists?self.chans[i].chan.toLowerCase():'',
						handler:exists?self.getHandler(i):-1,
						handlerB64:exists?self.getHandler(i,true):-1,
						loaded:false,
						load:function(data){
							if(data.lines === undefined){ // something went wrong....
								if(data.message){
									send.internal(data.message);
								}else{
									send.internal('<span style="color:#C73232;"><b>ERROR:</b> couldn\'t join channel</span>');
								}
								return false;
							}
							options.set('curChan',i);
							if(data.banned){
								send.internal('<span style="color:#C73232;"><b>ERROR:</b> banned</span>');
								return false;
							}
							
							users.setUsers(data.users);
							
							$.each(data.lines,function(i,line){
								eventOnMessage(line,true);
							});
							_self.loaded = true;
							return true;
						},
						part:function(){
							self.part(self.i);
						},
						reload:function(){
							self.join(self.i);
						},
						setI:function(i){
							_self.i = i;
						},
						is:function(i){
							return i == _self.i;
						}
					};
				return {
					name:_self.name,
					handler:_self.handler,
					handlerB64:_self.handlerB64,
					load:_self.load,
					part:_self.part,
					reload:_self.reload,
					loaded:function(){
						return _self.loaded;
					},
					setI:_self.setI,
					is:_self.is
				};
			},
			self = {
				current:false,
				chans:[],
				save:function(){
					ls.set('channels',self.chans);
				},
				loadSettings:function(){
					try{
						var chanList = ls.get('channels'),
							exChans = $.map(self.chans,function(ch){
								if((ch.ex && options.get('extraChans')) || !ch.ex){
									return ch;
								}
								return undefined;
							}),
							exChansInUse = [];
						if(chanList!==null && chanList!=[]){
							self.chans = $.merge(
									$.map(chanList,function(v){
										if(v.id != -1 && v.id.toString().substr(0,1)!='*'){
											var valid = false;
											$.each(self.chans,function(i,vc){
												if(vc.id == v.id){
													exChansInUse.push(v);
													valid = true;
													v.chan = vc.chan;
													return false;
												}
											});
											if(!valid){
												return undefined;
											}
										}
										return v;
									}),
									$.map(exChans,function(v){
										var oldChan = false;
										$.each(exChansInUse,function(i,vc){
											if(vc.id == v.id){
												oldChan = true;
												v.chan = vc.chan;
												return false
											}
										});
										if(oldChan){
											return undefined;
										}
										return v;
									})
								);
							save();
						}
					}catch(e){}
					oirc.onchannelchange(self.chans);
				},
				init:function(){
					self.current = Channel(-1);
					self.loadSettings();
				},
				addChan:function(s,chanid){
					var addChan = true;
					if(chanid === undefined){
						chanid = -1;
					}
					s = s.toLowerCase();
					$.each(self.chans,function(i,c){
						if(c.chan==s){
							addChan = i;
						}
					});
					if(addChan===true){
						self.chans.push({
							chan:s,
							high:false,
							ex:false,
							id:chanid,
							order:-1
						});
						self.save();
						oirc.onchannelchange(self.chans);
						return self.chans.length-1;
					}
					return addChan;
				},
				getHandler:function(i,b64){
					if(self.chans[i].id!=-1){
						if((typeof self.chans[i].id)!='number' && b64){
							return base64.encode(self.chans[i].id);
						}
						return self.chans[i].id.toString();
					}
					if(b64){
						return base64.encode(self.chans[i].chan);
					}
					return self.chans[i].chan;
				},
				requestHandler:false,
				load:function(i,fn){
					if(fn === undefined){
						fn = function(){};
					}
					if(self.chans[i] === undefined){
						fn(false,{});
						return;
					}
					request.stop(function(){
						if(self.requestHandler!==false){
							self.requestHandler.abort();
						}
						self.requestHandler = network.getJSON('Load.php?count=125&channel='+self.getHandler(i,true),function(data){
							options.set('curChan',i);
							self.current = Channel(i);
							if(self.current.load(data)){
								self.chans[i].high = false;
								self.save();
								request.joinChan(self.getHandler(i));
								request.start();
								fn(true,data);
								return;
							}
							fn(false,{});
						});
					});
				},
				join:function(s){
					var addChan = true;
					s = s.trim();
					if(s.substr(0,1) == '#'){
						send.internal('<span style="color:#C73232;">Join Error: Cannot join new channels starting with #.</span>');
						return -1;
					}
					if(s.substr(0,1) != '@'){
						s = '@' + s;
					}
					// s will now be either prefixed with # or with @
					return self.addChan(s);
				},
				joinPm:function(s,n,fn){
					if(fn === undefined){
						fn = function(){};
					}
					var addChan = true,
						callback = function(nick,id){
							nick = nick.trim();
							if(nick.substr(0,1)!='*'){
								nick = '*'+s;
							}
							id = id.trim();
							if(id.substr(0,1)!='*'){
								id = '*'+id;
							}
							// s will now be prefixed with *
							fn(self.addChan(nick,id));
						}
					if(n == ''){
						if(s.substr(0,1)=='@' || s.substr(0,1)=='#'){
							send.internal('<span style="color:#C73232;">Query Error: Cannot query a channel. Use /join instead.</span>');
							fn(-1);
							return;
						}
						network.getJSON('misc.php?openpm='+base64.encode(s),function(data){
							if(data.chanid){
								callback(data.channick,data.chanid);
							}else{
								send.internal('<span style="color:#C73232;">Query Error: User not found.</span>');
							}
						});
					}else{
						callback(s,n);
					}
				},
				part:function(i){
					if(parseInt(i,10) == i){ // we convert it to a number so that we don't have to deal with it
						i = parseInt(i,10);
					}
					if((typeof i)!='number'){
						// a string was passed, we need to get the correct i
						$.each(self.chans,function(ci,c){
							if(c.chan == i){
								i = ci;
							}
						});
					}
					if((typeof i)!='number' || self.chans[i] === undefined){ // we aren#t in the channel
						send.internal('<span style="color:#C73232;"> Part Error: I cannot part '+i+'. (You are not in it.)</span>');
						return -1;
					}
					if(self.chans[i].chan.substr(0,1)=='#'){
						send.internal('<span style="color:#C73232;"> Part Error: I cannot part '+self.chans[i].chan+'. (IRC channel.)</span>');
						return -1;
					}
					var chanId = self.chans[i].chanId;
					if(chanId == -1){
						chanId = self.chans[i];
					}
					request.partChan(self.getHandler(i));
					self.chans.splice(i,1);
					self.save();
					oirc.onchannelchange(self.chans);
					return i;
				},
				getList:function(){
					return self.chans;
				},
				setChans:function(c){
					self.chans = c;
				},
				getNames:function(){
					return $.map(self.chans,function(c){
						return c.chan;
					});
				}
			};
			return {
				init:self.init,
				load:self.load,
				join:self.join,
				joinPm:self.joinPm,
				part:self.part,
				getList:self.getList,
				getHandler:self.getHandler,
				current:function(){
					return self.current;
				},
				setChans:self.setChans,
				getNames:self.getNames
			};
		})(),
		users = (function(){
			var self = {
				users:[],
				draw:function(){
					self.users.sort(function(a,b){
						var al = a.nick.toLowerCase(),
							bl = b.nick.toLowerCase();
						return al==bl?(a==b?0:a<b?-1:1):al<bl?-1:1;
					});
					oirc.onuserchange(self.users);
				},
				exists:function(e){
					var result = false;
					$.each(self.users,function(i,us){
						if(us.nick.toLowerCase() == u.nick.toLowerCase() && us.network == u.network){
							result = true;
							return false;
						}
					});
					return result;
				},
				add:function(u){
					if(channels.current().handler!==''){
						var add = true;
						$.each(self.users,function(i,us){
							if(us.nick == u.nick && us.network == u.network){
								add = false;
								return false;
							}
						});
						if(add){
							self.users.push(u);
							self.draw();
						}
					}
				},
				remove:function(u){
					if(channels.current().handler!==''){
						$.each(self.users,function(i,us){
							if(us.nick == u.nick && us.network == u.network){
								self.users.splice(i,1);
								return false;
							}
						});
						self.draw();
					}
				},
				setUsers:function(u){
					self.users = u;
					self.draw();
				},
				getNames:function(){
					return $.map(self.users,function(u){
						return u.nick;
					});
				}
			};
			return {
				add:self.add,
				remove:self.remove,
				setUsers:self.setUsers,
				getNames:self.getNames
			};
		})(),
		commands = (function(){
			var self = {
				parse:function(s){
					var command = s.split(' ')[0].toLowerCase(),
						parameters = s.substr(command.length+1).toLowerCase().trim();
					switch(command){
						case 'j':
						case 'join':
							if(settings.isGuest()){
								send.internal('<span style="color:#C73232;"><b>ERROR:</b> can\'t join as guest</span>');
							}else{
								channels.open(parameters);
							}
							return true;
						case 'q':
						case 'query':
							if(settings.isGuest()){
								send.internal('<span style="color:#C73232;"><b>ERROR:</b> can\'t query as guest</span>');
							}else{
								channels.openPm(parameters,'',true);
							}
							return true;
						case 'win':
						case 'w':
						case 'window':
							channels.join(parseInt(parameters,10));
							return true;
						case 'p':
						case 'part':
							channels.part((parameters!==''?parameters:undefined));
							return true;
						case 'help':
							send.internal('<span style="color:#2A8C2A;">Commands: me, ignore, unignore, ignorelist, join, part, query, msg, window</span>');
							send.internal('<span style="color:#2A8C2A;">For full help go here: <a href="http://ourl.ca/19926" target="_top">http://ourl.ca/19926</a></span>');
							return true;
						case 'ponies':
							$.getScript('https://juju2143.ca/mousefly.js',function(){
								Derpy();
							});
							return true;
						case 'minty':
							$.getJSON(OMNOMIRCSERVER+'/minty.php').done(function(data){
								send.internal('<span style="font-size:5px;line-height:0;font-family:monospace;">'+data.minty+'</span>');
							});
							return true;
						default:
							return false;
					}
				}
			};
			return {
				parse:self.parse
			};
		})(),
		send = (function(){
			var self = {
				sending:false,
				send:function(s,fn,chan){
					if(fn === undefined){
						fn = function(){};
					}
					if(s !== '' && options.get('textDeco')){
						if(s[0] == '>'){
							s = '\x033'+s;
						}
						s = s.replace(/((^|\s)\*[^\*]+\*($|\s))/g,'\x02$1\x02')
								.replace(/((^|\s)\/[^\/]+\/($|\s))/g,'\x1d$1\x1d')
								.replace(/((^|\s)_[^_]+_($|\s))/g,'\x1f$1\x1f');
					}
					if(chan === undefined){
						chan = channels.current().handler;
					}
					if(s[0] == '/' && commands.parse(s.substr(1))){
						fn();
					}else{
						if(!self.sending){
							self.sending = true;
							request.send(s,chan,function(){
								self.sending = false;
								fn();
							});
						}
					}
				},
				internal:function(s){
					hookOnMessage({
						curLine:0,
						type:'internal',
						time:Math.floor((new Date()).getTime()/1000),
						name:'',
						message:s,
						name2:'',
						chan:channels.current().handler
					});
				}
			};
			return {
				internal:self.internal,
				send:self.send
			};
		})(),
		parser = (function(){
			var self = {
				smileys_a:[],
				cacheServerNicks:{},
				spLinks:[],
				name:function(n,o,uid){
					if(uid === undefined){
						uid = -1;
					}
					n = (n=='\x00'?'':n); //fix 0-string bug
					var ne = encodeURIComponent(n);
					n = $('<span>').text(n).html();
					var rcolors = [19,20,22,24,25,26,27,28,29],
						sum = 0,
						i = 0,
						cn = n,
						net = settings.getNetwork(o),
						addLink = true;
					switch(options.get('colordNames')){
						case '1': // calc
							while(n[i]){
								sum += n.charCodeAt(i++);
							}
							cn = $('<span>').append($('<span>').addClass('uName-'+rcolors[sum % 9].toString()).html(n)).html();
							break;
						case '2': //server
							if(net!==undefined && net.checkLogin!==undefined && uid!=-1){
								addLink = false;
								if(self.cacheServerNicks[o.toString()+':'+uid.toString()]===undefined){
									network.getJSON(net.checkLogin+'?c='+uid.toString(10)+'&n='+ne,function(data){
										self.cacheServerNicks[o.toString()+':'+uid.toString()] = data.nick;
									},false,false);
								}
								cn = self.cacheServerNicks[o.toString()+':'+uid.toString()];
							}else{
								cn = n;
							}
							break;
						default: // none
							cn = n;
							break;
					}
					if(net!==undefined && addLink){
						cn = net.normal.split('NICKENCODE').join(ne).split('NICK').join(cn).split('USERID').join(uid.toString(10));
					}
					if(net!==undefined){
						return '<span title="'+net.name+'">'+cn+'</span>';
					}
					return '<span title="Unknown Network">'+cn+'</span>';
				},
				smileys:function(s){
					if(!s){
						return '';
					}
					if(/^[\w\s\d\.,!?]*$/.test(s)){
						return s;
					}
					$.each(self.smileys_a,function(i,smiley){
						s = s.replace(RegExp(smiley.regex,'g'),smiley.replace);
					});
					return s;
				},
				links:function(text){
					if (!text || text === null || text === undefined){
						return '';
					}
					var ier = "[^\\s\x01\x04<\"]"; // url end regex
					text = text.replace(RegExp("(\x01|\x04)","g"),"");
					$.map(self.spLinks,function(url){
						url = url.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
						// we have > in that regex as it markes the end of <span>
						text = text.replace(RegExp("(^|[\\s>])((?:(?:f|ht)tps?:\/\/(?:www\\.)?)"+url+ier+"*)","g"),'$1\x01$2')
									.replace(RegExp("(^|[\\s>])("+url+ier+"*)","g"),'$1\x04$2');
					});
					return text.replace(RegExp("(^|[^a-zA-Z0-9_\x01\x04])((?:(?:f|ht)tps?:\/\/)"+ier+"+)","g"),'$1<a target="_blank" href="$2">$2</a>')
							.replace(RegExp("(^|[^a-zA-Z0-9_\x01\x04/])(www\\."+ier+"+)","g"),'$1<a target="_blank" href="http://$2">$2</a>')
							.replace(RegExp("(^|.)\x01("+ier+"+)","g"),'$1<a target="_top" href="$2">$2</a>')
							.replace(RegExp("(^|.)\x04("+ier+"+)","g"),'$1<a target="_top" href="http://$2">$2</a>');
				},
				colors:function(colorStr){
					var arrayResults = [],
						s,
						textDecoration = {
							fg:'-1',
							bg:'-1',
							underline:false,
							bold:false,
							italic:false
						},
						i,didChange;
					if(!colorStr){
						return '';
					}
					arrayResults = colorStr.split(RegExp('([\x02\x03\x0f\x16\x1d\x1f])'));
					colorStr='<span>';
					for(i=0;i<arrayResults.length;i++){
						didChange = true;
						switch(arrayResults[i]){
							case '\x03': // color
								s = arrayResults[i+1].replace(/^([0-9]{1,2}),([0-9]{1,2})(.*)/,'$1:$2');
								if(s == arrayResults[i+1]){ // we didn't change background
									s = arrayResults[i+1].replace(/^([0-9]{1,2}).*/,'$1:');
									if(s != arrayResults[i+1]){
										textDecoration.fg = s.split(':')[0];
										arrayResults[i+1] = arrayResults[i+1].substr(s.length-1); // -1 due to added colon
									}else{
										textDecoration.fg = '-1';
										textDecoration.bg = '-1';
									}
								}else{ // we also changed background
									textDecoration.fg = s.split(':')[0];
									textDecoration.bg = s.split(':')[1];
									if(s == arrayResults[i+1]){
										arrayResults[i+1] = '';
									}else{
										arrayResults[i+1] = arrayResults[i+1].substr(s.length);
									}
								}
								break;
							case '\x02': // bold
								textDecoration.bold = !textDecoration.bold;
								break;
							case '\x1d': // italic
								textDecoration.italic = !textDecoration.italic;
								break;
							case '\x16': // swap fg and bg
								s = textDecoration.fg;
								textDecoration.fg = textDecoration.bg;
								textDecoration.bg = s;
								if(textDecoration.fg=='-1'){
									textDecoration.fg = '0';
								}
								if(textDecoration.bg=='-1'){
									textDecoration.bg = '1';
								}
								break;
							case '\x1f': // underline
								textDecoration.underline = !textDecoration.underline;
								break;
							case '\x0f': // reset
								textDecoration = {
									fg:'-1',
									bg:'-1',
									underline:false,
									bold:false,
									italic:false
								}
								break;
							default:
								didChange = false;
						}
						if(didChange){
							colorStr += '</span>'+
									'<span class="fg-'+textDecoration.fg+' bg-'+textDecoration.bg+'" style="'+(textDecoration.bold?'font-weight:bold;':'')+(textDecoration.underline?'text-decoration:underline;':'')+(textDecoration.italic?'font-style:italic;':'')+'">';
						}else{
							colorStr+=arrayResults[i];
						}
					}
					colorStr += '</span>';
					// Strip codes
					colorStr = colorStr.replace(/(\x03|\x02|\x1F|\x09|\x0F)/g,'');
					return colorStr;
				},
				highlight:function(s){
					var style = '';
					if(!options.get('highRed')){
						style += 'background:none;padding:none;border:none;';
					}
					if(options.get('highBold')){
						style += 'font-weight:bold;';
					}
					return '<span class="highlight" style="'+style+'">'+s+'</span>';
				},
				parse:function(s,noSmileys){
					if(noSmileys==undefined || !noSmileys){
						noSmileys = false;
					}
					s = (s=="\x00"?'':s); //fix 0-string bug
					s = $('<span>').text(s).html(); // html escape
					if(options.get('smileys') && noSmileys===false){
						s = self.smileys(s);
					}
					s = self.colors(s);
					s = self.links(s);
					return s;
				},
				setSmileys:function(sm){
					self.smileys_a = [];
					$.each(sm,function(i,s){
						self.smileys_a.push({
							regex:s.regex,
							replace:s.replace.split('ADDSTUFF').join('data-code="'+s.code+'"').split('PIC').join(s.pic).split('ALT').join(s.alt),
						});
					});
				},
				setSpLinks:function(a){
					self.spLinks = a;
				},
				parseTextDecorations:function(s){
					if(s !== '' && options.get('textDeco')){
						if(s[0] == '>'){
							s = '\x033'+s;
						}
						s = s.replace(/((^|\s)\*[^\*]+\*($|\s))/g,'\x02$1\x02')
								.replace(/((^|\s)\/[^\/]+\/($|\s))/g,'\x1d$1\x1d')
								.replace(/((^|\s)_[^_]+_($|\s))/g,'\x1f$1\x1f');
					}
					return s;
				}
			};
			return {
				setSmileys:self.setSmileys,
				setSpLinks:self.setSpLinks,
				parse:self.parse,
				parseTextDecorations:self.parseTextDecorations,
				name:self.name,
				highlight:self.highlight
			};
		})(),
		
		oirc = {
			OMNOMIRCSERVER:OMNOMIRCSERVER,
			settings:{
				loggedIn:settings.loggedIn,
				fetch:settings.fetch,
				net:settings.net,
				getNetwork:settings.getNetwork,
				getPmIdent:settings.getPmIdent,
				getWholePmIdent:settings.getWholePmIdent,
				nick:settings.nick
			},
			ls:{
				get:ls.get,
				set:ls.set
			},
			network:{
				getJSON:network.getJSON,
				post:network.post
			},
			options:{
				get:options.get,
				set:options.set,
				getAll:options.getAll
			},
			instant:{
				current:instant.current
			},
			channels:{
				load:channels.load,
				join:channels.join,
				joinPm:channels.joinPm,
				part:channels.part,
				getList:channels.getList,
				getHandler:channels.getHandler,
				getNames:channels.getNames,
				current:channels.current,
				setChans:channels.setChans
			},
			users:{
				add:users.add,
				remove:users.remove,
				getNames:users.getNames
			},
			send:{
				send:send.send,
				internal:send.internal
			},
			parser:{
				parse:parser.parse,
				name:parser.name,
				highlight:parser.highlight
			},
			connect:function(callback){
				settings.fetch(function(){
					instant.init();
					request.init();
					channels.init();
					callback();
				});
			},
			disconnect:function(){
				instant.kill();
				request.kill();
			},
			onerror:function(){},
			onwarning:function(){},
			onmessage:function(){},
			onuserchange:function(){},
			onchannelchange:function(){}
		};
	return oirc;
}
