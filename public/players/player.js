function kick(){
    const urlParams = new URLSearchParams(window.location.search); 
    $.ajax({
        url: '/command?command=kick:'+urlParams.get("user"),
        type: 'get',
        success:function(){
            // Whatever you want to do after the form is successfully submitted
        }
    });
}
function ban(){
    const urlParams = new URLSearchParams(window.location.search); 
    $.ajax({
        url: '/command?command=ban:'+urlParams.get("user"),
        type: 'get',
        success:function(){
            // Whatever you want to do after the form is successfully submitted
        }
    });
}