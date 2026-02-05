														<td className="text-muted">{idx + 1}</td>
														<td className="text-muted">{pid || '—'}</td>
														<td className="text-end">{qty}</td>
														<td className="text-end">{window.KTM.money.formatNumber(price)}</td>
														<td className="text-end fw-semibold">{window.KTM.money.formatNumber(total)}</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						) : null}
					</AdminDrawer>
				</div>
			);
		}