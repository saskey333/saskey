console.log('esterminal: shop setup');
const SHOPURL = 'https://checkout.entirestudios.com';
const PAUSE_ROTATION_CLASS = 'js-pause';
const IMGLOADING_CLASS = 'js-loading';
const COUNTDOWN_CLASS = 'js-counting-down';
const CURRENCY_SELECTED = 'es-currency-selected';
const PRODUCT_PRICE_SELECTED = 'es-product-price-selected';
const SPLASH_SHOW = 'es-splash-show-v3';
const COUNTDOWN_FIN = 'es-countdown-fin';
window.lazySizesConfig = window.lazySizesConfig || {};
window.lazySizesConfig.expFactor = 3.2;
function pause() { document.body.classList.add(PAUSE_ROTATION_CLASS); }
function play() { document.body.classList.remove(PAUSE_ROTATION_CLASS); }
window.onblur = function() { pause(); }
window.onfocus = function() { play(); }
function startLoad() { document.body.classList.add(IMGLOADING_CLASS); }
function completeLoad() { console.log('esterminal: load complete'); document.body.classList.remove(IMGLOADING_CLASS); }
function typeWriter($dest, text, n) {
  if (n < (text.length)) {
    $dest.html(text.substring(0, n+1));
    n++;
    setTimeout(function() {
      typeWriter($dest, text, n);
    }, 100);
  }
}
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
/** Currency Helpers - formatMoney - Takes an amount in cents and returns it as a formatted dollar value */
Currency = (function() {
  var moneyFormat = '{{amount}}';
  function formatMoney(cents, format) {
    if (typeof cents === 'string') {
      cents = cents.replace('.', '');
    }
    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || moneyFormat;

    function formatWithDelimiters(number, precision, thousands, decimal) {
      thousands = thousands || ',';
      decimal = decimal || '.';
      if (isNaN(number) || number === null) {
        return 0;
      }
      number = (number / 100.0).toFixed(precision);
      var parts = number.split('.');
      var dollarsAmount = parts[0].replace(
        /(\d)(?=(\d\d\d)+(?!\d))/g,
        '$1' + thousands
      );
      var centsAmount = parts[1] ? decimal + parts[1] : '';
      return dollarsAmount + centsAmount;
    }
    switch (formatString.match(placeholderRegex)[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
      case 'amount_no_decimals_with_space_separator':
        value = formatWithDelimiters(cents, 0, ' ');
        break;
      case 'amount_with_apostrophe_separator':
        value = formatWithDelimiters(cents, 2, "'");
        break;
    }
    return formatString.replace(placeholderRegex, value);
  }
  return { formatMoney: formatMoney };
})();
/** Shopify storefront client */
ShopifyManager = class {
  constructor() {
    this.shopifyclient = ShopifyBuy.buildClient({
      domain: 'entire-studio-shop.myshopify.com',
      storefrontAccessToken: 'fa688666b4f72d4da86d861b18077d07'
    });
  }
  // Extended query expanding the sdk to include inventory via quantityAvailable
  productAvailableQty(handle) {
    const qtyQuery = this.shopifyclient.graphQLClient.query((root) => {
      root.add("productByHandle", { args: { handle: `${handle}` } },
        (product) => {
          product.add("title"); product.add("handle"); product.add("id");
          product.addConnection("variants",
            { args: { first: 99 } },
            (variant) => {
              variant.add("id"); variant.add("title"); variant.add("availableForSale"); variant.add("quantityAvailable");
            }
          );
        }
      );
    });
    return this.shopifyclient.graphQLClient.send(qtyQuery)
      .then((res) => JSON.parse(JSON.stringify(res.model.productByHandle)))
      .catch(() => null);
  }
};
/** app */
$(function () {
  var shopifyManager, pages, $body = $('body'), timeouts = [];
  var statusElem = document.querySelector('#es-status'), progressElem = document.querySelector('progress');
  var supportsProgress = progressElem && progressElem.toString().indexOf('Unknown') === -1;
  var audio = document.getElementById('es-welcomewhisper');
  /** loading **/
  function indicateLoadProgress(loaded, count, success) {
    if (supportsProgress) {
      if (loaded == 1) { progressElem.setAttribute('max', count); }
      progressElem.setAttribute('value', loaded);
    } else {
      console.log('esterminal: progress not supported');
      // @note IE does not support progress
    }
  }
  /** Countdown stuff **/
  function endCountdown() {
    if ( getCountdownFin() == null) { localStorage.setItem(COUNTDOWN_FIN, 'complete'); }
    console.log('esterminal: countdown end');
    $('.es-time').text('00:00:00:00');
    $('.es-countdown').addClass('es-countdown-over');
    $('.es-counting-down').addClass('es-countdown-over');
  }
  function setupCountdown() {
    var $body = $('.es-page');
    var dataDeadline = $('.countdown').data('deadline');
    var then = moment.tz(dataDeadline, "Pacific/Auckland");
    // America/Los_Angeles for testing other timezones
    //var then = moment().add(10, 'days');//just for recording from 10
    $('.es-time').countdown(then.toDate(), function(event) {
      $(this).html(event.strftime('%D:%H:%M:%S'));
      if (event.elapsed) { endCountdown(); }
    }).on('finish.countdown', function() { endCountdown(); });
  }
  /** Currency switching and storing */
  function getProductPriceSelected() {
    return sessionStorage.getItem(PRODUCT_PRICE_SELECTED);
  }
  function getCurrencyCodeSelected() {
    return sessionStorage.getItem(CURRENCY_SELECTED);
  }
  function setCurrency(value, currency) {
    $('.js-product-price-marker').html(value);
    sessionStorage.setItem(PRODUCT_PRICE_SELECTED, value);
    sessionStorage.setItem(CURRENCY_SELECTED, currency);
  }
  function getSplashShow() { return sessionStorage.getItem(SPLASH_SHOW); }
  function getCountdownFin() { return localStorage.getItem(COUNTDOWN_FIN); }
  function init() {
    startLoad();
    $body.waitForImages(completeLoad, indicateLoadProgress);
  }
  if (window.ShopifyBuy) {
    shopifyManager = new ShopifyManager();
  }

  /** splash reveal - show splash and wait */
  if (getSplashShow() == null) {
    console.log('esterminal: welcome');
    $body.addClass('es-page--welcome');

    $('.es-page--welcome').on('click', function (event) {
      console.log('*', getSplashShow());
      if (getSplashShow()) {
        return;
      }
      var el = $(this);
      el.addClass('es-whispering'); audio.play();
      console.log('esterminal: *entire studios*');
      el.removeClass('es-page--welcome');
      sessionStorage.setItem(SPLASH_SHOW, 'complete');
      init();
    });

  } else {
    console.log('esterminal: init on load', getSplashShow());
    init();
  }

  pages = [{
    namespace: 'product',
    onEnterCompleted: function () {
      var $productInfo = $('.es-product-info'),
          handle = $productInfo.attr('data-handle');

      function setProductDescription(dhtml, container) {
        var time = 100, lines = $('li', dhtml);
        lines.each(function (index, element) {
          var dest = $('<div></div>'); container.append(dest);
          if (index == 4) { time = time + 500; }
          timeouts.push(setTimeout(function () { typeWriter(dest, element.textContent, 0); }, time));
        });
      }

      shopifyManager.productAvailableQty(handle)
        .then(function(productWithQuantity) {
          var titleSource, titleDest, variants, variantContainer, remainingStock;
          var addToCartButton = $('.es-add-to-bag');
          // Type out product title
          titleSource = productWithQuantity.title; titleDest = $('.es-product-title-dest'); typeWriter(titleDest, titleSource, 0);
          // Refresh with button
          $('body').on('click', '.es-product-title-refresh', function (e) {
            var element = $(this); element.hide(); typeWriter(titleDest, titleSource, 0); setTimeout(function () { element.show(); }, 5);
          });

          // Setup product inventory @todo track so can't add too many to cart
          variants = productWithQuantity.variants;
          variantContainer = $('.es-product-variant-container');
          remainingStock = variants.length;
          for (var index = 0; index < variants.length; index++) {
            // Set variant button title and sold out / available
            var variant = variants[index], r = /\d+/, // selects number from atob
              variantId = atob(variant.id).match(r),
              variantBtn = $('<span data-qty="' + variant.quantityAvailable + '" class="es-product-variant"><input name="variant" type="radio" value="' + variantId + '"><span class="es-custom-input"></span>' + variant.title + '</span>');

            if (variant.quantityAvailable <= 0) {
              variantBtn.addClass('es-product-variant--sold-out');
              remainingStock = remainingStock - 1;
            }
            variantContainer.append(variantBtn);
          }
          if (remainingStock <= 0) {
            addToCartButton.addClass('es-add-to-bag--sold-out');
          }
          variantContainer.on('click', '.es-product-variant', function () {
            addToCartButton.removeClass('es-add-to-bag--select-variant');
          });

          shopifyManager.shopifyclient.product.fetch(productWithQuantity.id)
            .then(function (fullproduct) {
              var description = $('.es-product-description'), price = $('.es-product-price'), currencies = $('.es-product-currencies'),
                moneyFormat ='{{amount}}', // @todo could use '${{amount}}' as format just need to change symbol to do with currency
                productPrice, priceAmount, priceAmountFormatted, priceString, presentmentPrices, currencyProductPriceSelected;
              var dhtml = $(fullproduct.descriptionHtml);
              setProductDescription(dhtml, description);

              // Product price setup @note hax all variants have the same price assumption made
              productPrice = fullproduct.variants[0].priceV2;
              priceAmount = productPrice.amount;
              priceAmountFormatted = Currency.formatMoney(priceAmount*100,moneyFormat);
              priceValueString = priceAmountFormatted + ' ' + productPrice.currencyCode;
              priceString = $('<span class="js-product-price-marker es-text-caps">' + priceValueString + '</span>');
              price.append(priceString);

              // Set price in each currency for switcher
              presentmentPrices = fullproduct.variants[0].presentmentPrices;
              for (var index = 0; index < presentmentPrices.length; index++) {
                var pp = presentmentPrices[index].price;
                var pPriceAmount = pp.amount;
                var pPriceAmountFormatted = Currency.formatMoney(pPriceAmount*100,moneyFormat);
                var pPriceValueString = pPriceAmountFormatted + ' ' + pp.currencyCode;
                var pPrice = $('<option data-currency="' + pp.currencyCode + '" value="' + pPriceValueString + '">' + pp.currencyCode + ' ↓' + '</option>');
                currencies.append(pPrice);
              }
              // Detect currency selection changes
              currencies.change(function () {
                var optionSelected = $("option:selected", this),
                  valueSelected = this.value,
                  currencySelected = optionSelected.data('currency');
                setCurrency(valueSelected, currencySelected);
              });
              // Set prior currency selection saved in cache
              currencyProductPriceSelected = getProductPriceSelected();
              if (currencyProductPriceSelected) {
                setCurrency(currencyProductPriceSelected, getCurrencyCodeSelected());
                currencies.val(currencyProductPriceSelected);
              } else {
                // Default set to product price (USD) @todo could use geolocation at this point in future
                setCurrency(priceValueString, productPrice.currencyCode);
                currencies.val(priceValueString);
              }
            });
        });
    }
  }];

  pages.forEach(function (page) {
    var view = Barba.BaseView.extend(page);
    view.init();
  });
  function newPageInit() {
    // Scroll to top of page on switch
    document.body.scrollTop = document.documentElement.scrollTop = 0;
    for (var i=0; i<timeouts.length; i++) { clearTimeout(timeouts[i]); }

    // Init countdown on each page
    setupCountdown();
    console.log('esterminal: countdown on');
  }
  Barba.Pjax.start();
  Barba.Prefetch.init();
  Barba.Dispatcher.on('newPageReady', newPageInit); // initStateChange
  newPageInit();

  $(document).keyup(function (event) {
    var kc = event.keyCode;
    if (kc === 69) { console.log('esterminal: 69'); audio.play(); }
  });
  $body.on('click', '.es-add-to-bag', function(e) {
    var el = $(this);
    e.preventDefault();
    // Disable add to cart if size not selected yet
    if (!el.hasClass('es-add-to-bag--select-variant')) {
      var variantId = $("input[name=variant]:checked").val(),
        currencyCode = getCurrencyCodeSelected(),
        checkoutLink = SHOPURL + '/cart/add/' + variantId + '?currency=' + currencyCode;
      window.location = checkoutLink;
    }
  });
  $body.on('mouseenter', '.es-player--2', function (e) {
    var source = $('.es-player-annotation', this);
    var source1 = source.data('source-1'), source2 = source.data('source-2');
    var dest1 = $('.es-player-annotation-dest-1', source), dest2 = $('.es-player-annotation-dest-2', source);
    $(this).addClass('es-player--2-play');
    typeWriter(dest1, source1, 0);
    typeWriter(dest2, source2, 0);
  });
  $body.on('mouseleave', '.es-player--2', function (e) {
    $(this).removeClass('es-player--2-play');
  });
  $body.on('mouseenter', '.es-player--1', function (e) {
    var source = $('.es-player-annotation', this);
    var source1 = $('.es-player-annotation', this).data('source-1'), source2 = $('.es-player-annotation', this).data('source-2');
    var dest1 = $('.es-player-annotation-dest-1', source), dest2 = $('.es-player-annotation-dest-2', source);
    $(this).addClass('es-player--1-play');
    typeWriter(dest1, source1, 0);
    typeWriter(dest2, source2, 0);
  });
  $body.on('mouseleave', '.es-player--1', function (e) {
    $(this).removeClass('es-player--1-play');
  });
  // @todo rename from character
  $body.on('click', '.js-toggle-animation-character', function(e) {
    e.preventDefault();
    $(".es-character").toggleClass("es-character--animation");
  });
  $body.on('click', '.js-toggle-sizing-chart', function(e) {
    e.preventDefault();
    $(".es-sizing-chart-container").toggleClass("es-sizing-chart-container--open");
    $(".es-inner-page-container").toggleClass("es-inner-page-container--sizingchart");
  });
  $body.on('click', '.js-toggle-info', function(e) {
    e.preventDefault();
    $(".es-info-container").toggleClass("es-info-container--open");
    $(".es-info-toggle-container").toggleClass("es-info-toggle-container--open");
  });
  $body.on('click', '.js-info-overlay-toggle', function(e) {
    e.preventDefault();
    $(".es-info-container").toggleClass("es-info-container--info");
    $(".js-info-overlay-toggle").toggleClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--returns");
    $(".js-return-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--privacy");
    $(".js-privacy-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--terms");
    $(".js-terms-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--preorder");
    $(".js-preorder-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--shipping");
    $(".js-shipping-overlay-toggle").removeClass("es-info-terms-active");
  });
  $body.on('click', '.js-return-overlay-toggle', function(e) {
    e.preventDefault();
    $(".es-info-container").toggleClass("es-info-container--returns");
    $(".js-return-overlay-toggle").toggleClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--info");
    $(".js-info-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--privacy");
    $(".js-privacy-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--terms");
    $(".js-terms-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--preorder");
    $(".js-preorder-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--shipping");
    $(".js-shipping-overlay-toggle").removeClass("es-info-terms-active");
  });
  $body.on('click', '.js-privacy-overlay-toggle', function(e) {
    e.preventDefault();
    $(".es-info-container").toggleClass("es-info-container--privacy");
    $(".js-privacy-overlay-toggle").toggleClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--info");
    $(".js-info-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--returns");
    $(".js-return-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--terms");
    $(".js-terms-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--preorder");
    $(".js-preorder-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--shipping");
    $(".js-shipping-overlay-toggle").removeClass("es-info-terms-active");
  });
  $body.on('click', '.js-terms-overlay-toggle', function(e) {
    e.preventDefault();
    $(".es-info-container").toggleClass("es-info-container--terms");
    $(".js-terms-overlay-toggle").toggleClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--info");
    $(".js-info-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--returns");
    $(".js-return-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--privacy");
    $(".js-privacy-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--preorder");
    $(".js-preorder-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--shipping");
    $(".js-shipping-overlay-toggle").removeClass("es-info-terms-active");
  });
  $body.on('click', '.js-preorder-overlay-toggle', function(e) {
    e.preventDefault();
    $(".es-info-container").toggleClass("es-info-container--preorder");
    $(".js-preorder-overlay-toggle").toggleClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--info");
    $(".js-info-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--returns");
    $(".js-return-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--privacy");
    $(".js-privacy-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--terms");
    $(".js-terms-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--shipping");
    $(".js-shipping-overlay-toggle").removeClass("es-info-terms-active");
  });
  $body.on('click', '.js-shipping-overlay-toggle', function(e) {
    e.preventDefault();
    $(".es-info-container").toggleClass("es-info-container--shipping");
    $(".js-shipping-overlay-toggle").toggleClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--info");
    $(".js-info-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--returns");
    $(".js-return-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--privacy");
    $(".js-privacy-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--terms");
    $(".js-terms-overlay-toggle").removeClass("es-info-terms-active");
    $(".es-info-container").removeClass("es-info-container--preorder");
    $(".js-preorder-overlay-toggle").removeClass("es-info-terms-active");
  });
  // email func
  KlaviyoSubscribe.attachToForms('#email_signup_info', {
    hide_form_on_success: true,
    success_message: '<div class="es-cn">thank you</div>',
    extra_properties: { $source: '$embed', $method_type: "Klaviyo Form", $method_id: 'embed', $consent_version: 'Embed default text' }
  });
});
