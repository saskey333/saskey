$(document).ready(function(){
    $(".card1").click(function(){
        $(".card1").animate({
            left: '102px',
            top: '221px',
        });
        $(".card2").animate({
            left: '324px',
            top: '221px',
        });
        $(".card3").animate({
            left: '547px',
            top: '221px',
        });
        $(".card4").animate({
            left: '770px',
            top: '221px',
        });
        $(".card5").animate({
            left: '993px',
            top: '221px',
        });
        $(".card1").addClass("card11").removeClass("card1");
        $(".card2").addClass("card22").removeClass("card2");
        $(".card3").addClass("card33").removeClass("card3");
        $(".card4").addClass("card44").removeClass("card4");
        $(".card5").addClass("card55").removeClass("card5");
        let flag = 1;
        $(".card11").click(function(){
            if(flag == 1) {
                $(".card11").css({
                    width: 0,
                    border: 0
                })
    
                $(".card111").css({
                    display: 'block',
                    animationName: 'example', 
                    animationDuration: '0.5s',
                })
                flag *= -1;
            }
            else {
                console.log("asdf");
                $(".card11").css({
                    with: '184px',
                    border: '5px solid #FF002E',
                    animationName: 'example1', 
                    animationDuration: '0.5s',
                })
                $(".card111").css({
                    display: 'none'
                })
            }
        });
    });
    
});



