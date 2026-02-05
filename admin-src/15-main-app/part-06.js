                      </thead>
                      <tbody>
                        {(Array.isArray(reconDrawerOrder?.raw?.items) ? reconDrawerOrder.raw.items
                          : (Array.isArray(reconDrawerOrder?.raw?.order_items) ? reconDrawerOrder.raw.order_items : []))
                          .slice(0, 100)
                          .map((it, idx) => (
                            <tr key={`it-${idx}`}>
                              <td className="text-muted">{idx + 1}</td>
                              <td className="text-muted">{String(it?.product_id ?? it?.id ?? '')}</td>
                              <td className="text-end">{Number(it?.qty ?? it?.quantity ?? 0) || 0}</td>
                              <td className="text-end">{window.KTM.money.formatNumber(Number(it?.price ?? it?.unit_price ?? 0) || 0)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </AdminDrawer>

          */}

            <div className="row g-2">
              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm bg-dark bg-opacity-10">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-muted small">Tổng đơn (không tính hủy/nháp)</div>
                    <i className="fas fa-receipt text-dark"></i>
                  </div>
                  <div className="fs-4 fw-semibold text-dark">{formatNumber(stats.activeOrders)}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm bg-warning bg-opacity-10">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-muted small">Doanh thu (tạm tính)</div>
                    <i className="fas fa-sack-dollar text-warning"></i>
                  </div>
                  <div className="fs-4 fw-semibold text-dark">{formatVND(stats.totalRevenue)}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm bg-success bg-opacity-10">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-muted small">Doanh thu (Hoàn thành)</div>
                    <i className="fas fa-circle-check text-success"></i>
                  </div>
                  <div className="fs-4 fw-semibold text-dark">{formatVND(stats.doneRevenue)}</div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm bg-info bg-opacity-10">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-muted small">Hoa hồng sẽ nhận (theo % SP - trừ ship ước tính)</div>
                    <i className="fas fa-chart-line text-info"></i>
                  </div>
                  <div className="fs-4 fw-semibold text-dark">{formatVND(stats.tempCommission)}</div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="card p-3 border-0 shadow-sm bg-primary bg-opacity-10">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="text-muted small">Hoa hồng tổng (theo % SP - trừ ship ước tính)</div>
                    <i className="fas fa-coins text-primary"></i>
                  </div>
                  <div className="fs-4 fw-semibold text-dark">{formatVND(stats.tempCommissionAll)}</div>
                </div>
              </div>
            </div>

            <div className="card p-3 mt-3">
              <div className="d-flex align-items-center justify-content-between">
                <h6 className="mb-0"><i className="fas fa-layer-group me-2 text-warning"></i>Tổng quan trạng thái</h6>
                <span className="badge rounded-pill bg-dark bg-opacity-10 text-dark">
                  SL TB/đơn: {stats.avgQtyPerOrder ? stats.avgQtyPerOrder.toFixed(2) : '0.00'}
                </span>
              </div>
              {/* Mobile: compact cards */}
              <div className="d-md-none mt-2">
                <div className="row g-2">
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-light bg-opacity-10">
                      <div className="text-muted small">Nháp</div>
                      <div className="fw-semibold">{formatNumber(stats.statusCounts.draft)}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-secondary bg-opacity-10">
                      <div className="text-muted small">Chờ xử lý</div>
                      <div className="fw-semibold">{formatNumber(stats.statusCounts.pending)}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-warning bg-opacity-10">
                      <div className="text-muted small">Đang vận chuyển</div>
                      <div className="fw-semibold">{formatNumber(stats.statusCounts.processing)}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-danger bg-opacity-10">
                      <div className="text-muted small">Hủy đơn</div>
                      <div className="fw-semibold">{formatNumber(stats.statusCounts.canceled)}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-success bg-opacity-10">
                      <div className="text-muted small">Hoàn thành</div>
                      <div className="fw-semibold">{formatNumber(stats.statusCounts.done)}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-primary bg-opacity-10">
                      <div className="text-muted small">Đã nhận tiền</div>
                      <div className="fw-semibold">{formatNumber(stats.statusCounts.paid)}</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="card p-2 border-0 shadow-sm bg-dark bg-opacity-10">
                      <div className="text-muted small">Tổng SL</div>
                      <div className="fw-semibold">{formatNumber(stats.totalQty)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-none d-md-block table-responsive mt-2">
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>Nháp</th>
                      <th>Chờ xử lý</th>
                      <th>Đang vận chuyển</th>
                      <th>Hủy đơn</th>
                      <th>Hoàn thành</th>
                      <th>Đã nhận tiền</th>
                      <th>Khác</th>
                      <th>Tổng SL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{formatNumber(stats.statusCounts.draft)}</td>
                      <td>{formatNumber(stats.statusCounts.pending)}</td>
                      <td>{formatNumber(stats.statusCounts.processing)}</td>
                      <td>{formatNumber(stats.statusCounts.canceled)}</td>
                      <td>{formatNumber(stats.statusCounts.done)}</td>
                      <td>{formatNumber(stats.statusCounts.paid)}</td>
                      <td>{formatNumber(stats.statusCounts.other)}</td>
                      <td>{formatNumber(stats.totalQty)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-3 mt-3">
              <div className="d-flex align-items-center justify-content-between">
                <h6 className="mb-0"><i className="fas fa-box me-2 text-info"></i>Top sản phẩm</h6>
                <span className="badge rounded-pill bg-info bg-opacity-10 text-dark">Theo doanh thu • Top 10</span>
              </div>
              {/* Mobile: card list */}
              <div className="d-md-none mt-2">
                {stats.products.slice(0, 10).map((p) => (
                  <div key={p.product_id} className="card mb-2 p-2 border-0 shadow-sm border-start border-4 border-info">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="fw-semibold" style={{ minWidth: 0, flex: 1 }}>
                        <div className="text-truncate">{p.product_name}</div>
                        <div className="text-muted small text-truncate">
                          {p.product_code ? `#${p.product_code} • ` : ''}
                          {formatNumber(p.orders)} đơn • {formatNumber(p.quantity)} SL
                        </div>
                      </div>
                      <div className="fw-semibold text-nowrap">{formatVND(p.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-none d-md-block table-responsive mt-2">
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Mã</th>
                      <th>Đơn</th>
                      <th>SL</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.products.slice(0, 10).map((p) => (
                      <tr key={p.product_id}>
                        <td>{p.product_name}</td>
                        <td>{p.product_code || '—'}</td>
                        <td>{formatNumber(p.orders)}</td>
                        <td>{formatNumber(p.quantity)}</td>
                        <td className="fw-semibold">{formatVND(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-3 mt-3">
              <div className="d-flex align-items-center justify-content-between">
                <h6 className="mb-0"><i className="fas fa-user-group me-2 text-warning"></i>Top khách hàng</h6>
                <span className="badge rounded-pill bg-warning bg-opacity-10 text-dark">Theo doanh thu • Top 10</span>
              </div>
              {/* Mobile: card list */}
              <div className="d-md-none mt-2">
                {stats.customers.slice(0, 10).map((c) => (
                  <div key={c.key} className="card mb-2 p-2 border-0 shadow-sm border-start border-4 border-warning">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="fw-semibold" style={{ minWidth: 0, flex: 1 }}>
                        <div className="text-truncate">{c.customer_name || '—'}</div>
                        <div className="text-muted small text-truncate">
                          {c.phone || '—'} • {formatNumber(c.orders)} đơn • {formatNumber(c.quantity)} SL
                        </div>
                      </div>
                      <div className="fw-semibold text-nowrap">{formatVND(c.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-none d-md-block table-responsive mt-2">
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>Khách hàng</th>
                      <th>SĐT</th>
                      <th>Đơn</th>
                      <th>SL</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.customers.slice(0, 10).map((c) => (
                      <tr key={c.key}>
                        <td>{c.customer_name || '—'}</td>
                        <td>{c.phone || '—'}</td>
                        <td>{formatNumber(c.orders)}</td>
                        <td>{formatNumber(c.quantity)}</td>
                        <td className="fw-semibold">{formatVND(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-3 mt-3 mb-4">
              <div className="d-flex align-items-center justify-content-between">
                <h6 className="mb-0"><i className="fas fa-calendar-day me-2 text-success"></i>Theo ngày</h6>
                <span className="badge rounded-pill bg-success bg-opacity-10 text-dark">DT (tạm tính) & hoàn thành</span>
              </div>
              {/* Mobile: card list */}
              <div className="d-md-none mt-2">
                {stats.days.map((d) => (
                  <div key={d.day} className="card mb-2 p-2 border-0 shadow-sm border-start border-4 border-success">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="fw-semibold">{d.day}</div>
                        <div className="text-muted small">
                          {formatNumber(d.orders)} đơn • {formatNumber(d.quantity)} SL
                        </div>
                        <div className="text-muted small">
                          Hoàn thành: {formatNumber(d.doneOrders)} • {formatVND(d.doneRevenue)}
                        </div>
                      </div>
                      <div className="fw-semibold text-nowrap">{formatVND(d.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-none d-md-block table-responsive mt-2">
                <table className="table table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Đơn</th>
                      <th>SL</th>
                      <th>DT (tạm tính)</th>
                      <th>Đơn hoàn thành</th>
                      <th>DT hoàn thành</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.days.map((d) => (
                      <tr key={d.day}>
                        <td>{d.day}</td>
                        <td>{formatNumber(d.orders)}</td>
                        <td>{formatNumber(d.quantity)}</td>
                        <td className="fw-semibold">{formatVND(d.revenue)}</td>
                        <td>{formatNumber(d.doneOrders)}</td>
                        <td className="fw-semibold">{formatVND(d.doneRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div>
          <Sidebar 
            activeMenu={activeMenu} 
            onMenuChange={(menu) => {
              trackRecentMenu(menu);
              setActiveMenu(menu);
              if (menu === 'albums') {
                setCurrentAlbumFolder(null);
                setAlbumBreadcrumb([]);
                loadAlbums(null);
              }
            }} 
            onLogout={handleLogout}
            currentUser={currentUser}
            pinnedMenus={pinnedMenus}
            recentMenus={recentMenus}
            onTogglePin={togglePinnedMenu}
          />
          
          <div className="main-content">
            <header className="admin-topbar" role="banner">
              {(() => {
                const menuMeta = {
                  search: { title: 'Tra cứu', icon: 'fa-search', sub: 'Tìm nhanh sản phẩm/khách/đơn' },
                  albums: { title: 'Album', icon: 'fa-images', sub: 'Quản lý ảnh & folder' },
                  videos: { title: 'Video', icon: 'fa-video', sub: 'Quản lý video & folder' },
                  products: { title: 'Sản phẩm', icon: 'fa-box', sub: 'Danh sách, giá, mô tả' },
                  orders: { title: 'Đơn hàng', icon: 'fa-receipt', sub: 'Tạo & theo dõi trạng thái' },
                  recon: { title: 'Đối soát Excel', icon: 'fa-file-excel', sub: 'Đối soát công nợ từ Excel' },
                  stats: { title: 'Thống kê', icon: 'fa-chart-column', sub: 'Doanh thu & hoa hồng' },
                  settings: { title: 'Cài đặt', icon: 'fa-cog', sub: 'Tuỳ chỉnh hệ thống' },
                };

                const meta = menuMeta[activeMenu] || { title: 'KTM Admin', icon: 'fa-tractor', sub: '' };
                const displayName =
                  currentUser?.username || currentUser?.name || currentUser?.email || 'Admin';

                const breadcrumbText = (() => {
                  if (activeMenu !== 'albums') return '';
                  const items = [];
                  items.push('Root');
                  if (Array.isArray(albumBreadcrumb) && albumBreadcrumb.length > 0) {
                    items.push(...albumBreadcrumb.map(b => b?.title).filter(Boolean));
                  }
                  if (selectedAlbum?.title) items.push(selectedAlbum.title);
                  return items.length > 0 ? items.join(' / ') : '';
                })();

                return (
                  <div className="admin-topbar-inner">
                    <div className="admin-topbar-left">
                      <div className="admin-page-icon" aria-hidden="true">
                        <i className={`fas ${meta.icon}`}></i>
                      </div>
                      <div className="admin-page-title">
                        <div className="admin-page-heading">{meta.title}</div>
                        <div className="admin-page-subtitle">
                          {breadcrumbText || meta.sub}
                        </div>
                      </div>
                    </div>

                    <div className="admin-topbar-right">
                      {activeMenu === 'albums' && (
                        <button
                          className="btn btn-warning btn-sm admin-topbar-action"
                          onClick={handleCreateAlbum}
                          title="Tạo folder"
                        >
                          <i className="fas fa-plus me-2"></i>
                          <span className="d-none d-sm-inline">Folder</span>
                        </button>
                      )}

                      <a
                        href="/"
                        className="btn btn-outline-secondary btn-sm d-none d-md-inline-flex"
                        title="Về trang chủ"
                      >
                        <i className="fas fa-home me-2"></i>Trang chủ
                      </a>

                      <div className="admin-user-chip" title={displayName}>
                        <i className="fas fa-user-circle"></i>
                        <span className="admin-user-chip-name">{displayName}</span>
                      </div>

                      <button
                        className="btn btn-outline-danger btn-sm d-md-none"
                        onClick={handleLogout}
                        title="Đăng xuất"
                      >
                        <i className="fas fa-sign-out-alt"></i>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </header>

            <div className="admin-page-body">
              {activeMenu === 'albums' && !selectedAlbum && (
                <AlbumList
                  albums={albums}
                  loading={loading}
                  currentFolder={currentAlbumFolder}
                  breadcrumb={albumBreadcrumb}
                  onSelect={handleSelectAlbum}
                  onCreate={handleCreateAlbum}
                  onEdit={handleEditAlbum}
                  onDelete={handleDeleteAlbum}
                  onBack={handleAlbumBack}
                />
              )}

              {activeMenu === 'search' && (
                <SearchCenter 
                  showToast={showToast} 
                  onNavigate={(menu, action, payload) => {
                    setActiveMenu(menu);
                    if (menu === 'orders' && action === 'create') {
                      setOrderAutoOpenCreateToken(Date.now());
                      setOrderAutoOpenCreateProductId(payload?.productId || '');
                    }
                  }}
                />
              )}

              {activeMenu === 'albums' && selectedAlbum && (
                <AlbumDetail
                  album={selectedAlbum}
                  parentAlbum={albumBreadcrumb.length > 0 ? albumBreadcrumb[albumBreadcrumb.length - 1] : null}
                  onBack={() => {
                    // Go back to parent folder or album list
                    if (selectedAlbum.parentId) {
                      // Find parent in breadcrumb or go to list
                      const parentIdx = albumBreadcrumb.findIndex(b => b.uuid === selectedAlbum.parentId);
                      if (parentIdx >= 0) {
                        setSelectedAlbum(albumBreadcrumb[parentIdx]);
                      } else {
                        setSelectedAlbum(null);
                      }
                    } else {
                      setSelectedAlbum(null);
                    }
                  }}
                  onRefresh={() => loadAlbums(currentAlbumFolder?.uuid)}
                  showToast={showToast}
                  onNavigateToFolder={(folder) => {
                    // Navigate into subfolder - track breadcrumb
                    setAlbumBreadcrumb(prev => [...prev, selectedAlbum]);
                    setSelectedAlbum(folder);
                  }}
                  onEditSubfolder={(folder) => {
                    setEditingAlbum(folder);
                    setShowAlbumModal(true);
                  }}
                />
              )}

              {activeMenu === 'videos' && (
                <VideoList
                  showToast={showToast}
                />
              )}

              {activeMenu === 'products' && (
                <ProductManager showToast={showToast} settings={settings} />
              )}
              {activeMenu === 'orders' && (