# Pantalla única de la app: un WebView a pantalla completa que abre el juego
# guardado dentro del APK (assets/game), así funciona sin internet.
.class public Lcom/quenomefumen/app/MainActivity;
.super Landroid/app/Activity;

.field private web:Landroid/webkit/WebView;

.method public constructor <init>()V
    .locals 0
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .locals 3
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    # FLAG_FULLSCREEN | FLAG_KEEP_SCREEN_ON
    invoke-virtual {p0}, Lcom/quenomefumen/app/MainActivity;->getWindow()Landroid/view/Window;
    move-result-object v0
    const/16 v1, 0x480
    invoke-virtual {v0, v1}, Landroid/view/Window;->addFlags(I)V

    new-instance v0, Landroid/webkit/WebView;
    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object v0, p0, Lcom/quenomefumen/app/MainActivity;->web:Landroid/webkit/WebView;

    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object v1
    const/4 v2, 0x1
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V
    const/4 v2, 0x0
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setMediaPlaybackRequiresUserGesture(Z)V

    # fondo #0d0a14 mientras carga
    const v1, -0xf2f5ec
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setBackgroundColor(I)V

    invoke-virtual {p0, v0}, Lcom/quenomefumen/app/MainActivity;->setContentView(Landroid/view/View;)V
    invoke-direct {p0}, Lcom/quenomefumen/app/MainActivity;->hideBars()V

    const-string v1, "file:///android_asset/game/index.html"
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    return-void
.end method

# Esconde las barras del sistema (modo inmersivo)
.method private hideBars()V
    .locals 2
    iget-object v0, p0, Lcom/quenomefumen/app/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :done
    const/16 v1, 0x1706
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setSystemUiVisibility(I)V
    :done
    return-void
.end method

.method public onWindowFocusChanged(Z)V
    .locals 0
    invoke-super {p0, p1}, Landroid/app/Activity;->onWindowFocusChanged(Z)V
    if-eqz p1, :end
    invoke-direct {p0}, Lcom/quenomefumen/app/MainActivity;->hideBars()V
    :end
    return-void
.end method

# Al salir de la app se guarda el progreso
.method protected onPause()V
    .locals 3
    invoke-super {p0}, Landroid/app/Activity;->onPause()V
    iget-object v0, p0, Lcom/quenomefumen/app/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :end
    const-string v1, "try{persist()}catch(e){}"
    const/4 v2, 0x0
    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    invoke-virtual {v0}, Landroid/webkit/WebView;->onPause()V
    :end
    return-void
.end method

.method protected onResume()V
    .locals 1
    invoke-super {p0}, Landroid/app/Activity;->onResume()V
    iget-object v0, p0, Lcom/quenomefumen/app/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :end
    invoke-virtual {v0}, Landroid/webkit/WebView;->onResume()V
    :end
    return-void
.end method
