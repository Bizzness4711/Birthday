# Y💙V Hatıra Defteri

Dış kütüphane kullanmayan, tek sayfalık romantik bir hatıra defteri sitesidir. Masaüstünde iki sayfa, tablet ve telefonda tek sayfa gösterilir. Masaüstü dönüşleri üç boyutlu, mobil dönüşler ise bazı Android tarayıcılarda boş sayfa oluşmaması için daha hafif iki boyutlu animasyon kullanır.

Siteyi yayınlarken `index.html`, `styles.css`, `main1.js` ve `assets` klasörünün aynı dizin yapısını koruyun. Geliştirme sırasında `index.html` dosyasını bir yerel sunucuyla açmanız önerilir.

## Hızlı dosya haritası

- Sayfalar, mektuplar, görünen tarihler ve fotoğraf etiketleri: `index.html`
- Tarih hesapları, şifre, ses yolları ve tüm etkileşimler: `main1.js`
- Renkler, ölçüler, mobil/masaüstü görünüm ve animasyonlar: `styles.css`
- Fotoğraflar: `assets/images`
- Kitap açma ve sayfa çevirme sesleri: `assets/audio`

## Fotoğrafları değiştirme

Aynı dosya adını ve aynı gerçek dosya biçimini koruyarak mevcut görselin üzerine kendi görselinizi koyarsanız genellikle başka kod düzenlemeniz gerekmez:

- `assets/images/1.jpeg`: Biriken Anılar sayfasındaki ilk kart
- `assets/images/2.jpeg`: İkinci kart ve galerideki ilk fotoğraf
- `assets/images/4.jpeg`: Küçük Notlar sayfasındaki fotoğraf
- `assets/images/gizli.jpeg`: Gece temasındaki ay Easter egg’i açılınca gösterilen gizli fotoğraf
- Galerinin diğer fotoğrafları: `index.html` içindeki `id="memorySliderTrack"` bölümünde sıralanır

Bir JPEG/PNG dosyasına yalnızca başka bir uzantı vermeyin. JPG, PNG veya WebP gibi başka bir biçim kullanırsanız dosyayı gerçek uzantısıyla kaydedin ve `index.html` içindeki ilgili tüm `src="assets/images/..."` yollarını aynı uzantıyla güncelleyin.

Fotoğraflar kişilerin tamamı görünecek biçimde ortalanır. Kaynağı yana dönük olan görsellerde yönüne göre `class="photo-turn-left"` veya `class="photo-turn-right"` kullanılır. Bu görseli daha sonra düz bir fotoğrafla değiştirirseniz dönüş sınıfını kaldırın; yeni görsel de yana dönükse doğru sınıfı koruyun.

Fotoğraf yazıları:

- Ana iki kartın alt yazısı: `.photo-front small`
- Küçük fotoğrafın alt yazısı: `.mini-photo span`
- Galeri fotoğraflarının alt yazısı: `.memory-slide span`
- Gizli fotoğrafın altındaki yazı: `.secret-polaroid p`

Yükleme ve mobil performansı için fotoğrafları mümkünse WebP/JPEG olarak, uzun kenarı yaklaşık 1600–2000 piksel ve birkaç yüz KB boyutunda hazırlayın.

## Galeriye yeni fotoğraf ekleme

1. Yeni fotoğrafı `assets/images` klasörüne koyun. Örnek: `photo-4.jpg`.
2. `index.html` içinde `id="memorySliderTrack"` bölümünü bulun.
3. Var olan `data-memory-slide` düğmelerinden birini kopyalayıp son slayttan sonra ekleyin:

```html
<button class="memory-slide" type="button" data-memory-slide aria-label="Dördüncü anıyı göster">
  <img src="assets/images/photo-4.jpg" alt="Dördüncü anımız">
  <span>Bu fotoğrafın kısa notu</span>
</button>
```

Noktalar, fotoğraf sayacı, oklar, mobil kaydırma ve bulanık arka plan JavaScript tarafından otomatik oluşturulur. `memory-slider-backdrop` içindeki iki görseli silmeyin veya çoğaltmayın; bunlar yumuşak arka plan geçişi için kullanılan iki ayrı katmandır.

## Sesleri değiştirme

Mevcut dosyaların üzerine aynı adla yeni MP3 koyarsanız kod değişmez:

- `assets/audio/book-open.mp3`: Kitap açma sesi
- `assets/audio/page-turn.mp3`: Sayfa çevirme sesi
- `assets/audio/background-music.mp3`: Defter açıkken döngüde çalan arka plan müziği

Arka plan müziğine farklı bir ad verirseniz `index.html` başındaki `backgroundMusic` alanında bulunan `<source src="...">` yolunu güncelleyin.

Arka plan müziği tarayıcıların otomatik oynatma kurallarına uygun olarak kullanıcı “Dokun ve Aç” düğmesine bastığında başlar, döngüde devam eder ve mevcut “Ses açık/kapalı” düğmesiyle durdurulup sürdürülebilir. Müzik seviyesi `main1.js` içindeki `audio.backgroundMusic.volume = 0.18` satırından ayarlanır. Kitap açma efektlerinin genel seviyesi `item.volume = 0.48`, sayfa sesi ise `audio.pageTurn.volume = 0.34` satırından ayarlanır.

## Tarih, şifre ve konum

`main1.js` başındaki `CONFIG` nesnesi:

- `togetherSince`: Birlikte olma sayacının başlangıç tarihi
- `letterUnlocksAt`: Zarfın açılacağı tarih
- `secretPassword`: Ay Easter egg’inin şifresi
- `midyat`: Gün doğumu/gün batımı teması için Midyat koordinatları
- `audio`: Ses dosyalarının yolları

Görünen tarih metinleri ayrıca `index.html` içinde yazılıdır. Tarihi değiştirirken şu alanları da kontrol edin:

- `.cover-date`
- `.date-script`
- `.counter-caption`
- Fotoğraf kartındaki `08.02` yazısı
- `.letter-date`
- Mektup sayfasındaki başlık
- `.endpaper-content`

## Metinleri değiştirme

- Kapak: `#coverTitle`, `.cover-kicker`, `.cover-date`
- Sayfalardaki ana yazılar: Her `.book-page` içindeki `.page-content`
- Kalp notları: `.love-notes`
- Sayfa kenarındaki kurşun kalem notları: `.margin-pencil-note`
- Dilek sayfasındaki alıntı: `.page-promise blockquote`
- Gelecekte gösterilecek mesaj: `#futureMessageDialog blockquote`
- Zarfın üzerindeki alıcı yazısı: `.envelope-paper`
- Açılacak mektup: `.letter-copy`, `.letter-date`, `.letter-signature`
- Kilitli zarfın farklı mesajları: `main1.js` içindeki `lockedEnvelopeMessages`
- Yanlış şifre mesajları: `main1.js` içindeki `wrongPasswordMessages`
- Başarım metinleri: `main1.js` içindeki `updateCompletion()`

İsimleri ve baş harfleri topluca kişiselleştirirken projede `Y💙V`, `YV` ve `Vesilem` ifadelerini aratın.

## Test ve kayıtlı ilerleme

- Gece temasını hemen görmek için: `index.html?theme=night`
- Diğer tema değerleri: `sunrise`, `morning`, `noon`, `sunset`, `night`
- Gezilen sayfalar, seçilen hatırlatma tarihi, Easter egg ve mektup durumu tarayıcının `localStorage` alanında saklanır.
- Baştan test etmek için tarayıcıdaki bu siteye ait yerel verileri temizleyin veya gizli pencere kullanın.
