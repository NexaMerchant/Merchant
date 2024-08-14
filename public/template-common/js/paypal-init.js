function getPaypalClientId(pay_acc="default"){var key_map={'default':'AUCKrDN-G8FKQel-Yh0HAL65ullJN0olEVT-KcU_XHCHnUU8YiyxH8LEqiuBoP2FETuySg4yaWJ6BIAz','acyril':'AYHwQxm2SUGOytqfinzapfGe3YcbbMQ481XmL2jN08t4-JWTvGgT5JW70DoJ9_I_nxPFufOkHbsfeY5p','miaodian':'AS4M9Mv70SRoO831s37fY-8yOdsUwqo3Fq14NitCKADRWI8P9WZ9kKMOjfgLqM48pErHCGFXM4YzkX93','channel_1':'ASiHXUp9R5EOTq3dg2WDilfcn6yZmPeZUk8dgCRXSa7gANW08Tii57-LaSymZ5f8YxiYZ5B5nUJOWD92','channel_2':'AZn__oYimmRydKun7AcaEzlvvEbgXd9o-NUAGz0T9TArVil4YUJDPVV8IGVgQzIxH823iH1MxOrL-nHJ',}
return key_map[pay_acc]||key_map['default'];}
function paypalInit(paypal_pay_acc,options,callbacks){var paypal_client=getPaypalClientId(paypal_pay_acc);var currency=options.currency||'USD';var has_paypal_later=options.has_paypal_later||false;var script=document.createElement('script');if(script.readyState){script.onreadystatechange=function(){if(script.readyState==='loaded'||script.readyState==='complete'){script.onreadystatechange=null;creatPaypalCardButton(options,callbacks);}}}else{script.onload=function(){creatPaypalCardButton(options,callbacks);}}
script.type='text/javascript';let src='https://www.paypal.com/sdk/js?client-id='+paypal_client+'&components=buttons,messages,funding-eligibility&currency='+currency;if(has_paypal_later){src+="&enable-funding=paylater";}else{src+="&disable-funding=paylater";}
script.src=src;document.body.appendChild(script);}
function creatPaypalCardButton(options,callbacks){var FUNDING_SOURCES=options.FUNDING_SOURCES||[{fundingSource:'PAYPAL'}];var create_order_url=options.create_order_url;var check_order_url=options.check_order_url;var language=options.language||{};FUNDING_SOURCES.forEach(function(item){var error_id=item.error_id;var render_id=item.render_id;var paypal_type=item.paypal_type;var fundingSource=paypal.FUNDING[item.fundingSource];var style={layout:fundingSource===paypal.FUNDING.CARD?'vertical':'horizontal',};var button_style=item.button_style||{};Object.assign(style,button_style);var button=paypal.Buttons({style:style,fundingSource:fundingSource===paypal.FUNDING.CARD?paypal.FUNDING.CARD:undefined,createOrder:function(data,actions){if(callbacks.createOrderBefore){callbacks.createOrderBefore(data,actions);}
var params=options.order_params;if('function'==typeof options.order_params){params=options.order_params(paypal_type||'paypal');}
if(params.error){if(callbacks.errorCallback){callbacks.errorCallback(item,params.error);}
throw new Error('Verification failed');}
var url=create_order_url+'?time='+new Date().getTime();$('#loading').show();$('#'+(error_id||'paypal-error')).hide();return fetch(url,{body:JSON.stringify(params),method:'POST',headers:{'content-type':'application/json'},}).then(function(res){return res.json()}).then(function(res){$('#loading').hide();var data=res;if(data.result===200){var order_info=data.info;localStorage.setItem("order_id",order_info._id.$oid);if(callbacks.createOrderSuccess){callbacks.createOrderSuccess(params,order_info);}
return order_info.client_secret;}else{var pay_error=JSON.parse(data.error);var pay_error_message=pay_error.details;if(pay_error_message&&pay_error_message.length){var show_pay_error_message_arr=[];for(var pay_error_message_i=0;pay_error_message_i<pay_error_message.length;pay_error_message_i++){show_pay_error_message_arr.push(language.field+":"+pay_error_message[pay_error_message_i].field+"<br /> "+language.value_str+pay_error_message[pay_error_message_i].value+'. <br />'+pay_error_message[pay_error_message_i].description+'<br /><br />')}
if(callbacks.errorCallback){callbacks.errorCallback(item,show_pay_error_message_arr);}}}})},onApprove:function(data,actions){if(callbacks.onApproveBefore){callbacks.onApproveBefore(data,actions);}
if(!data.orderID){throw new Error('orderid is not exisit');}
var request_params={client_secret:data.orderID,id:localStorage.getItem('order_id'),}
var request='';for(var i=0;i<Object.keys(request_params).length;i++){request+=Object.keys(request_params)[i]+'='+request_params[Object.keys(request_params)[i]]+'&';}
request=request.substr(0,request.length-1);var url=check_order_url+'?'+request;$('#loading').show();return fetch(url,{method:'get',headers:{'content-type':'application/json'},}).then(function(res){return res.json()}).then(function(res){$('#loading').hide();if(res.result===200){var info=res.info;if(info.pay_status){var redirect_url=options.redirect_url||'';if(redirect_url.indexOf('?')>-1){redirect_url+='&';}else{redirect_url+='?'}
redirect_url+='id='+localStorage.getItem('order_id')+'&client_secret='+data.orderID
Goto(redirect_url);}}
if(res.error=='INSTRUMENT_DECLINED'){if(callbacks.errorCallback){callbacks.errorCallback(item,[language.balance_error]);}}})},onError:function(err){console.log('error from the onError callback',err);}});if(button.isEligible()){button.render('#'+(render_id||'paypal-card-submit'));}})}